import { useState } from 'react';

export default function SettlementCard({ apiUrl, suggestedAmountUSD, fxRate, localCurrency, reason }) {
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
      <h3>Settle via mobile money</h3>
      <p>
        The trader never touches crypto. This converts ${Number(suggestedAmountUSD).toFixed(2)} into{' '}
        {localCurrency || 'local currency'} and pushes a normal mobile money prompt to their phone.
      </p>
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

      {error && <div style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>{error}</div>}

      {receipt && (
        <div className="receipt">
          <div className="receipt__title">&#10003; Confirmed by trader</div>
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
