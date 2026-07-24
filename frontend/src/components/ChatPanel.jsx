import { useEffect, useRef, useState } from 'react';
import SettlementCard from './SettlementCard.jsx';

const SUGGESTIONS = [
  "Crossing at Busia with electronics worth $800, need it delivered 30kg by truck to Kampala",
  "What's the rate today and customs at Malaba for textiles worth 300 dollars?",
  "Namanga crossing, produce worth $150, boda boda delivery to Arusha",
];

export default function ChatPanel({ messages, onSend, loading, input, setInput, apiUrl }) {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, expanded]);

  function submit(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
  }

  function toggleExpanded(i) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <section className="chat-panel">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            Ask Passage's trade agent what to expect at a crossing today &mdash; a rate, a customs
            estimate, a delivery quote. It'll pay whatever data providers it needs to answer, in
            fractions of a cent, and show you the receipt on the right.
          </div>
        )}

{messages.map((m, i) => {
          const customs = m.details?.customs;
          const fx = m.details?.fx;

          return (
            <div key={i}>
              <div className={`bubble bubble--${m.role}`}>{m.text}</div>

              {m.role === 'agent' && customs && (
                <div style={{ marginTop: 8, marginBottom: 4, maxWidth: '78%' }}>
                  {!expanded[i] ? (
                    <button className="chip" onClick={() => toggleExpanded(i)}>
                      Pay this ${Number(customs.estimatedDutyUSD).toFixed(2)} customs duty via mobile money
                    </button>
                  ) : (
                    <SettlementCard
                      apiUrl={apiUrl}
                      suggestedAmountUSD={customs.estimatedDutyUSD}
                      fxRate={fx?.rate}
                      localCurrency={fx?.to}
                      reason={`Customs duty at ${customs.crossing}`}
                      onCancel={() => toggleExpanded(i)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="bubble bubble--agent is-thinking">
            <span className="dots">Agent is paying providers and composing an answer</span>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="chips">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="chip" onClick={() => onSend(s)}>
              {s.length > 46 ? `${s.slice(0, 46)}\u2026` : s}
            </button>
          ))}
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Crossing at Busia today, electronics worth $800\u2026"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
