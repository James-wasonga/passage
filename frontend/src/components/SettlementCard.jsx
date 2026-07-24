import { useState } from 'react';

const COPY = {
  duty: {
    title: 'Pay customs duty via mobile money',
    description: (amount, currency) =>
      `You'll owe roughly $${amount} in customs duty at the border. This converts it to ${currency} and ` +
      "sends a normal mobile money prompt to the trader's own phone to confirm.",
    note:
      'Simulated for this demo \u2014 no real SMS or STK push is sent. A production version would push this ' +
      'directly to the trader\u2019s own revenue-authority paybill (e.g. KRA/URA), never to a Passage-held account \u2014 ' +
      'see docs/ARCHITECTURE.md.',
    confirmedLabel: '\u2713 Confirmed by trader',
  },
  fee: {
    title: 'Pay Passage\u2019s service fee via mobile money',
    description: (amount, currency) =>
      `This is Passage's own revenue \u2014 the markup on top of what providers were paid. Converts $${amount} ` +
      `into ${currency} and prompts the trader (or a sponsoring organization's number) to confirm.`,
    note:
      'Simulated for this demo \u2014 no real SMS or STK push is sent. In production this settles to a ' +
      'Passage-owned mobile money account, unlike the duty flow above which must never touch Passage\u2019s own funds.',
    confirmedLabel: '\u2713 Fee collected',
  },
};

export default function SettlementCard({ apiUrl, suggestedAmountUSD, fxRate, localCurrency, reason, kind = 'duty', onCancel }) {
  const copy = COPY[kind] || COPY.duty;
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  async function handleSettle() {
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${apiUrl}/api/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          amountUSD: suggestedAmountUSD,
          fxRateUsedToLocal: fxRate,
          localCurrency,
          reason,
        }),
      });
      if (!resp.ok) throw new Error('Settlement request failed');
      const data = await resp.json();
      setReceipt(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settle-card">
      <h3>{copy.title}</h3>
      <p>{copy.description(Number(suggestedAmountUSD).toFixed(2), localCurrency || 'local currency')}</p>
      <p style={{ color: 'var(--amber)', fontSize: 11.5 }}>{copy.note}</p>
      <div className="settle-row">
        <input
          placeholder="Phone number, e.g. 254712345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading || !!receipt}
        />
        <button onClick={handleSettle} disabled={loading || !!receipt || !phone.trim()}>
          {loading ? 'Sending\u2026' : receipt ? 'Sent' : 'Send prompt'}
        </button>
      </div>

      {onCancel && !receipt && (
        <button
          onClick={onCancel}
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
          <div className="receipt__title">{copy.confirmedLabel}</div>
          <div className="receipt__row">
            <span>Amount</span>
            <b>
              {receipt.localAmount.toLocaleString()} {receipt.localCurrency}
            </b>
          </div>
          <div className="receipt__row">
            <span>To</span>
            <b>{receipt.phoneNumber}</b>
          </div>
          <div className="receipt__row">
            <span>Receipt no.</span>
            <b>{receipt.receiptNumber}</b>
          </div>
        </div>
      )}
    </div>
  );
}
