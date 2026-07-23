import { config } from '../config.js';

const CROSSINGS = ['busia', 'malaba', 'namanga', 'gatuna'];
const GOODS = ['electronics', 'textiles', 'produce', 'vehicle_parts'];
// Note: USD is deliberately excluded here - it's always the base currency
// we convert FROM, never a valid target, so it must never be matched as
// "the currency the trader wants a rate for".
const TARGET_CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'ETB', 'NGN', 'GHS', 'ZAR'];
const VEHICLES = ['boda_boda', 'boda', 'pickup', 'truck', 'truck_7ton'];

// Common everyday abbreviations traders actually type, mapped to ISO codes.
// "shilling"/"shillings" alone is deliberately NOT mapped here since it's
// ambiguous between KES/UGX/TZS - we rely on the explicit short codes below,
// or on the crossing-implied default when nothing explicit is said.
const CURRENCY_ALIASES = {
  ksh: 'KES',
  kes: 'KES',
  ush: 'UGX',
  ugx: 'UGX',
  ugsh: 'UGX',
  tsh: 'TZS',
  tzs: 'TZS',
  rwf: 'RWF',
  frw: 'RWF',
  birr: 'ETB',
  naira: 'NGN',
  cedi: 'GHS',
  cedis: 'GHS',
  rand: 'ZAR',
};

const CROSSING_TO_ROUTE = {
  busia: 'busia_kampala',
  malaba: 'malaba_kampala',
  namanga: 'namanga_arusha',
  gatuna: 'gatuna_kigali',
};

// Keywords that indicate the message is even remotely about a trade-corridor
// query. If NONE of these appear, we treat the message as off-topic rather
// than guessing defaults and spending real money on a meaningless answer.
const TRADE_SIGNAL_PATTERN =
  /rate|exchange|convert|worth|customs|duty|tax|cross|border|deliver|transport|last.?mile|logistics|carry|move|haul|pay|settle|send money|mpesa|momo|payout|withdraw|\$|usd|dollar|shilling|ksh|ugx|tsh|kes|electronics|textiles|produce|vehicle|goods|kg|truck|boda|pickup/;

function findTargetCurrency(text) {
  // Prefer explicit 3-letter ISO codes first, then common local aliases.
  // USD is intentionally never returned - see TARGET_CURRENCIES note above.
  const isoHit = TARGET_CURRENCIES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(text));
  if (isoHit) return isoHit;

  for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(text)) return code;
  }
  return null;
}

function extractValueUSD(text) {
  // Prefer numbers explicitly marked as a value - a leading "$", or the
  // words "worth"/"valued at"/"value of" nearby - over any bare digit.
  const markerMatch =
    text.match(/(?:worth|valued at|value of)\s*\$?\s?(\d+(?:[.,]\d+)?)/) ||
    text.match(/\$\s?(\d+(?:[.,]\d+)?)/);
  if (markerMatch) return Number(markerMatch[1].replace(',', ''));

  // Fall back to the first bare number that ISN'T immediately followed by
  // "kg" (that's a weight, not a value) or "usd"/"dollars" (that's a unit
  // label in a rate-conversion question like "1 USD to KES", not a
  // declared shipment value).
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s?(kg|usd|dollars)?/g)) {
    if (!m[2]) return Number(m[1].replace(',', ''));
  }
  return 0;
}

function ruleBasedParse(message) {
  const text = message.toLowerCase();

  if (!TRADE_SIGNAL_PATTERN.test(text)) {
    return { offTopic: true };
  }

  // A plain "how much is X to Y" / "convert X to Y" / "what's the rate to
  // Y" question is only ever about the exchange rate - it should never
  // pull in a customs or logistics estimate, even if a stray number in the
  // sentence (e.g. the "1" in "1 USD") could otherwise look like a value.
  const isPureRateQuery =
    /^(what'?s|what is|how much is|how much|convert)\b/.test(text.trim()) &&
    /\b(to|in)\b/.test(text) &&
    !/customs|duty|tax|cross|border|deliver|transport|last.?mile|logistics|carry|move|haul/.test(text) &&
    !GOODS.some((g) => text.includes(g.replace('_', ' ')) || text.includes(g));

  if (isPureRateQuery) {
    const mentionedCurrency = findTargetCurrency(text);
    return {
      crossing: 'busia',
      route: CROSSING_TO_ROUTE.busia,
      goods: 'general',
      valueUSD: 0,
      weightKg: 20,
      vehicle: 'boda_boda',
      fxTarget: mentionedCurrency || 'UGX',
      needs: { fx: true, customs: false, logistics: false },
      wantsSettlement: false,
    };
  }

  const crossing = CROSSINGS.find((c) => text.includes(c)) || 'busia';
  const goods = GOODS.find((g) => text.includes(g.replace('_', ' ')) || text.includes(g)) || 'general';
  const valueUSD = extractValueUSD(text);

  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s?kg/);
  const weightKg = weightMatch ? Number(weightMatch[1]) : 20;

  let vehicle = VEHICLES.find((v) => text.includes(v)) || 'boda_boda';
  if (vehicle === 'boda') vehicle = 'boda_boda';
  if (vehicle === 'truck') vehicle = 'truck_7ton';

  const mentionedCurrency = findTargetCurrency(text);

  const wantsCustoms = /customs|duty|tax|cross|border/.test(text) || GOODS.some((g) => text.includes(g));
  const wantsLogistics = /deliver|transport|last mile|last-mile|logistics|carry|move|haul/.test(text);
  const wantsSettlement = /pay|settle|send money|mpesa|momo|payout|withdraw/.test(text);

  return {
    crossing,
    route: CROSSING_TO_ROUTE[crossing],
    goods,
    valueUSD,
    weightKg,
    vehicle,
    // Explicit currency mention always wins. Otherwise fall back to the
    // destination-side currency implied by the crossing (e.g. Busia/Malaba
    // lead into Uganda, so UGX is the natural "what will I get over there"
    // default) - but a trader asking about their own home currency should
    // just say it (KSH, birr, naira, etc.) and it'll be respected.
    fxTarget: mentionedCurrency || 'UGX',
    needs: {
      // The FX rate is deliberately always included as free baseline
      // context for every trade-related query - it's cheap ($0.003) and
      // almost always useful alongside a customs or logistics answer.
      fx: true,
      customs: wantsCustoms || valueUSD > 0,
      logistics: wantsLogistics,
    },
    wantsSettlement,
  };
}

/**
 * Optional upgrade path: if ANTHROPIC_API_KEY is set, ask Claude to do the
 * structured extraction instead of regex. Entirely optional - falls back
 * to the rule-based parser on any error or if no key is configured.
 */
export async function parseIntent(message) {
  if (!config.anthropicApiKey) {
    return ruleBasedParse(message);
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system:
          'Extract structured trade-corridor query fields from the message as strict JSON only, no prose, matching this shape: ' +
          '{"offTopic":boolean,"crossing":"busia|malaba|namanga|gatuna","route":"busia_kampala|malaba_kampala|namanga_arusha|gatuna_kigali","goods":"electronics|textiles|produce|vehicle_parts|general","valueUSD":number,"weightKg":number,"vehicle":"boda_boda|pickup|truck_7ton","fxTarget":"KES|UGX|TZS|RWF|ETB|NGN|GHS|ZAR","needs":{"fx":boolean,"customs":boolean,"logistics":boolean},"wantsSettlement":boolean}. ' +
          'Set offTopic:true (and omit other fields, or set them to safe defaults) if the message has nothing to do with cross-border trade, customs, exchange rates, or last-mile delivery - e.g. small talk, unrelated questions, or requests outside this domain. ' +
          'Recognize common local currency abbreviations traders actually use (KSH/KES = Kenyan shilling, USH/UGX = Ugandan shilling, TSH/TZS = Tanzanian shilling) and map them to the correct ISO code in fxTarget.',
        messages: [{ role: 'user', content: message }],
      }),
    });
    const data = await resp.json();
    const text = data.content?.find((b) => b.type === 'text')?.text || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return parsed;
  } catch (err) {
    return ruleBasedParse(message);
  }
}