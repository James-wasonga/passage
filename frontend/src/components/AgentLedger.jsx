import { useEffect, useState } from "react";

const PROVIDER_LABELS = {
  fx: 'FX Rate',
  customs: 'Customs',
  logistics: 'Logistics',
};

function truncateHash(hash) {
  if (!hash || hash.length < 14) return hash || '\u2014';
  return `${hash.slice(0, 8)}\u2026${hash.slice(-6)}`;
}

function Ticket({ entry }) {
  const label = PROVIDER_LABELS[entry.provider] || entry.provider;

  if (!entry.ok) {
    return (
      <div className="ticket">
        <div className="ticket__head">
          <span className="ticket__provider is-error">{label}</span>
          <span className="ticket__stamp" style={{ color: 'var(--red)', borderColor: 'rgba(226,104,95,0.5)' }}>
            FAILED
          </span>
        </div>
        <div className="ticket__divider" />
        <div className="ticket__body">
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{entry.error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket">
      <div className="ticket__head">
        <span className="ticket__provider">{label}</span>
        <span className="ticket__stamp">PAID</span>
      </div>
      <div className="ticket__divider" />
      <div className="ticket__body">
        <span className="ticket__amount">${Number(entry.amountUSD).toFixed(3)}</span>
        <div className="ticket__meta">
          <div className="ticket__latency">{entry.latencyMs}ms &middot; {entry.network}</div>
          <div className="ticket__hash">{truncateHash(entry.txHash)}</div>
        </div>
      </div>
    </div>
  );
}

export default function AgentLedger({ entries, totalSpentUSD, serviceFeeUSD, amountChargedUSD, sponsored, fxDetails, mode, apiUrl }) {

  const [feeExpanded, setFeeExpanded] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setFeeExpanded(false);
    setPhone('');
    setLoading(false);
    setReceipt(null);
    setError('');
  }, [entries]);

  async function handleCollectFee() {
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${apiUrl}/api/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          amountUSD: serviceFeeUSD,
          fxRateUsedToLocal: fxDetails?.rate,
          localCurrency: fxDetails?.to,
          reason: 'Passage service fee',
        }),
      });
      if (!resp.ok) throw new Error('Fee collection failed');
      setReceipt(await resp.json());
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }
  return (
    <aside className="ledger-panel">
      <div className="ledger-panel__head">
        <h2>Toll Ledger</h2>
        <p>Every micropayment your agent makes to fetch an answer, in real time.</p>
      </div>

      {entries.length === 0 ? (
        <div className="ledger-empty">
          No payments yet. Ask the agent something &mdash; each data provider it consults<br />
          prints a ticket here the moment it's paid.
        </div>
      ) : (
        <>
          <div className="ticket-stream">
            {entries.map((entry, i) => (
              <Ticket key={i} entry={entry} />
            ))}
          </div>
          <div className="ledger-total">
            <span className="ledger-total__label">Provider cost, last query</span>
            <span className="ledger-total__value">${Number(totalSpentUSD).toFixed(3)}</span>
          </div>

          {sponsored?.active ? (
            <div
              className="settle-card"
              style={{ marginTop: 4, borderColor: 'rgba(107,207,154,0.35)', background: 'rgba(107,207,154,0.06)' }}
            >
              <h3 style={{ color: 'var(--green)' }}>Sponsored &mdash; free for this trader</h3>
              <p>
                {sponsored.name} is covering this query's provider cost and Passage's service fee.
                No mobile money prompt is needed.
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                Remaining sponsor balance: ${Number(sponsored.remainingBalanceUSD).toFixed(3)}. Once it runs out,
                Passage automatically falls back to charging the normal service fee.
              </p>
            </div>
          ) : (
            serviceFeeUSD > 0 && (
              <>
                <div className="ledger-total" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <span className="ledger-total__label">+ Passage service fee</span>
                  <span className="ledger-total__value" style={{ color: 'var(--teal)' }}>
                    ${Number(serviceFeeUSD).toFixed(3)}
                  </span>
                </div>
                <div className="ledger-total" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span className="ledger-total__label" style={{ fontWeight: 600, color: 'var(--text)' }}>
                    = Amount charged
                  </span>
                  <span className="ledger-total__value">${Number(amountChargedUSD).toFixed(3)}</span>
                </div>

                {sponsored?.configured && (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                    {sponsored.name}'s sponsor balance has run out ($0 remaining) &mdash; charging the standard
                    fee until it's topped up again.
                  </p>
                )}

                {!feeExpanded ? (
                  <button className="chip" style={{ marginTop: 10 }} onClick={() => setFeeExpanded(true)}>
                    Pay Passage's ${Number(serviceFeeUSD).toFixed(3)} service fee via mobile money
                  </button>
                ) : (
                  <div className="settle-card" style={{ marginTop: 10 }}>
                    <h3>Pay Passage&rsquo;s service fee via mobile money</h3>
                    <p>
                      This ${Number(serviceFeeUSD).toFixed(3)} is Passage's own revenue &mdash; the markup on top
                      of what providers were paid. This is how the platform sustains itself instead of only ever
                      spending on lookups. See docs/ARCHITECTURE.md for the sponsored-access alternative.
                    </p>
                    <p style={{ color: 'var(--amber)', fontSize: 11.5 }}>
                      Simulated for this demo. In production this settles to a Passage-owned mobile money
                      account &mdash; unlike customs duty, which must never touch Passage's own funds.
                    </p>
                    <div className="settle-row">
                      <input
                        placeholder="Phone number, e.g. 254712345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading || !!receipt}
                      />
                      <button onClick={handleCollectFee} disabled={loading || !!receipt || !phone.trim()}>
                        {loading ? 'Sending\u2026' : receipt ? 'Sent' : 'Send prompt'}
                      </button>
                    </div>

                    {!receipt && (
                      <button
                        onClick={() => setFeeExpanded(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          fontSize: 12,
                          marginTop: 10,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Cancel &mdash; not now, keep researching
                      </button>
                    )}

                    {error && <div style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>{error}</div>}
                    {receipt && (
                      <div className="receipt">
                        <div className="receipt__title">&#10003; Fee collected</div>
                        <div className="receipt__row">
                          <span>Amount</span>
                          <b>
                            {receipt.localAmount.toLocaleString()} {receipt.localCurrency}
                          </b>
                        </div>
                        <div className="receipt__row">
                          <span>From</span>
                          <b>{receipt.phoneNumber}</b>
                        </div>
                        <div className="receipt__row">
                          <span>Receipt no.</span>
                          <b>{receipt.receiptNumber}</b>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </>
      )}

<div className="footer-note">
        {mode === 'demo'
          ? 'Demo mode: provider payments are simulated (no real funds move). Switch to live mode to settle real USDC on Base Sepolia.'
          : 'Live mode: provider payments settled in USDC on Base Sepolia via the x402 protocol.'}
      </div>
    </aside>
  );
}
