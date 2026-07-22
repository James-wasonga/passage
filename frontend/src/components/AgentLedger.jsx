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

export default function AgentLedger({ entries, totalSpentUSD, mode }) {
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
            <span className="ledger-total__label">Total spent, last query</span>
            <span className="ledger-total__value">${Number(totalSpentUSD).toFixed(3)}</span>
          </div>
        </>
      )}

      <div className="footer-note">
        {mode === 'demo'
          ? 'Demo mode: payments are simulated (no real funds move). Switch to live mode to settle real USDC on Base Sepolia.'
          : 'Live mode: settled in USDC on Base Sepolia via the x402 protocol.'}
      </div>
    </aside>
  );
}
