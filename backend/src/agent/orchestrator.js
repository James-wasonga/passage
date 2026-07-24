import { config } from '../config.js';
import { parseIntent } from './intentParser.js';
import { fetchWithPayment } from './walletClient.js';
import { recordSettlement } from '../ledger/ledgerClient.js';
import { trySponsor, getSponsorStatus } from './sponsorship.js';

const CROSSING_LABELS = {
  busia: 'Busia',
  malaba: 'Malaba',
  namanga: 'Namanga',
  gatuna: 'Gatuna',
};

function baseUrl() {
  return `http://localhost:${config.port}`;
}

async function callProvider({ label, path, priceUSD }) {
  const start = Date.now();
  const { response, receipt } = await fetchWithPayment(`${baseUrl()}${path}`, { method: 'GET' }, priceUSD);
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.error || body?.message || JSON.stringify(body);
    } catch {
      // response wasn't JSON - keep the generic HTTP status detail
    }
    return {
      label,
      ok: false,
      error: detail,
      latencyMs,
      receipt,
    };
  }

  const data = await response.json();
  return { label, ok: true, data, latencyMs, receipt };
}

/**
 * Runs one full trader query end to end:
 *   1. Parse the free-text message into structured intent
 *   2. Pay + call each provider the query actually needs (sequentially)
 *   3. Compose a plain-language answer
 *   4. Record the settlement to the ledger
 */
export async function handleTraderQuery({ traderId, message }) {
  const intent = await parseIntent(message);

  if (intent.offTopic) {
    return {
      answer:
        "I'm Passage's trade corridor agent - I can help with border crossings, customs estimates, " +
        "exchange rates, and last-mile delivery quotes. Try asking something like \"crossing at Busia " +
        'with electronics worth $800\" or "what\'s today\'s rate to KSH?".',
      intent,
      details: { fx: null, customs: null, logistics: null },
      agentLog: [],
      totalSpentUSD: 0,
      serviceFeeUSD: 0,
      amountChargedUSD: 0,
      sponsored: null,
      ledger: { recordedAt: new Date().toISOString(), onChainTx: null },
    };
  }

  const jobs = [];

  if (intent.needs.fx) {
    jobs.push({
      label: 'fx',
      path: `/providers/fx?from=USD&to=${intent.fxTarget}`,
      priceUSD: priceToNumber(config.prices.fx),
    });
  }
  if (intent.needs.customs) {
    jobs.push({
      label: 'customs',
      path: `/providers/customs?crossing=${intent.crossing}&goods=${intent.goods}&valueUSD=${intent.valueUSD}`,
      priceUSD: priceToNumber(config.prices.customs),
    });
  }
  if (intent.needs.logistics) {
    jobs.push({
      label: 'logistics',
      path: `/providers/logistics?route=${intent.route}&weightKg=${intent.weightKg}&vehicle=${intent.vehicle}`,
      priceUSD: priceToNumber(config.prices.logistics),
    });
  }

  // Deliberately sequential, not Promise.all: in live mode every payment is
  // settled on-chain by the same shared facilitator relayer wallet. Firing
  // them concurrently causes that single relayer to submit multiple
  // transactions back-to-back with colliding nonces ("replacement
  // transaction underpriced"). One at a time avoids the race entirely, at
  // the cost of a little latency - an acceptable trade for correctness.
  const results = [];
  for (const job of jobs) {
    results.push(await callProvider(job));
  }
  const byLabel = Object.fromEntries(results.map((r) => [r.label, r]));

  const answer = composeAnswer(intent, byLabel);
  const providerCostUSD = results.filter((r) => r.ok).reduce((sum, r) => sum + (r.receipt?.amountUSD || 0), 0);
  const paidCount = results.filter((r) => r.ok).length;

  // Passage's revenue only applies when the agent actually did paid work -
  // an all-failed query shouldn't charge a fee for nothing delivered.
  // const serviceFeeUSD = paidCount > 0 ? config.serviceFeeUSD : 0;
  // Sponsorship first: if an NGO/SACCO/trade-association balance covers the
  // full economic value of this query (provider cost + what Passage's fee
  // would have been), the trader is charged nothing at all. Only when no
  // sponsor balance is available (or it's run out) does Passage fall back
  // to charging its normal per-query service fee.
  let serviceFeeUSD = 0;
  let sponsored = { active: false, ...getSponsorStatus() };
  if (paidCount > 0) {
    const fullValueUSD = providerCostUSD + config.serviceFeeUSD;
    if (trySponsor(fullValueUSD)) {
      sponsored = { active: true, ...getSponsorStatus() };
    } else {
      serviceFeeUSD = config.serviceFeeUSD;
      sponsored = { active: false, ...getSponsorStatus() };
    }
  }
  const amountChargedUSD = providerCostUSD + serviceFeeUSD;

  const ledgerRecord = await recordSettlement({
    traderId,
    message,
    intent,
    totalSpentUSD: round(providerCostUSD),
    serviceFeeUSD: round(serviceFeeUSD),
    sponsored: sponsored.active,
    providerCount: paidCount,
  });

  return {
    answer,
    intent,
    details: {
      fx: byLabel.fx?.ok ? byLabel.fx.data : null,
      customs: byLabel.customs?.ok ? byLabel.customs.data : null,
      logistics: byLabel.logistics?.ok ? byLabel.logistics.data : null,
    },
    agentLog: results.map((r) => ({
      provider: r.label,
      ok: r.ok,
      latencyMs: r.latencyMs,
      amountUSD: r.receipt?.amountUSD,
      txHash: r.receipt?.txHash,
      network: r.receipt?.network,
      error: r.error,
    })),
    totalSpentUSD: round(providerCostUSD),
    serviceFeeUSD: round(serviceFeeUSD),
    amountChargedUSD: round(amountChargedUSD),
    sponsored,
    ledger: { recordedAt: ledgerRecord.recordedAt, onChainTx: ledgerRecord.onChainTx || null },
  };
}

function priceToNumber(price) {
  return Number(String(price).replace('$', ''));
}

function round(n) {
  return Math.round(n * 10000) / 10000;
}

function composeAnswer(intent, byLabel) {
  const lines = [];
  const crossingLabel = CROSSING_LABELS[intent.crossing] || intent.crossing;

  if (byLabel.fx?.ok) {
    const { rate, to } = byLabel.fx.data;
    lines.push(`Today's rate: 1 USD \u2248 ${rate} ${to} (interbank-referenced, better than most border kiosks).`);
  }

  if (byLabel.customs?.ok) {
    const c = byLabel.customs.data;
    lines.push(
      `At ${crossingLabel}: expect roughly $${c.estimatedDutyUSD} in duty + fees on ${c.goods} valued at $${c.declaredValueUSD} ` +
        `(${c.dutyRatePct}% rate). Average queue right now is about ${c.avgQueueMinutes} minutes.`
    );
  }

  if (byLabel.logistics?.ok) {
    const l = byLabel.logistics.data;
    lines.push(
      `Last-mile delivery for ${l.weightKg}kg via ${l.vehicle.replace('_', ' ')} on this route: about $${l.quoteUSD}.`
    );
  }

  if (!lines.length) {
    lines.push("I couldn't fetch live data for that just now - try rephrasing with a border crossing and goods type.");
  }

  return lines.join(' ');
}
