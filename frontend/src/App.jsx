import { useEffect, useState } from 'react';
import ChatPanel from './components/ChatPanel.jsx';
import AgentLedger from './components/AgentLedger.jsx';
import SettlementCard from './components/SettlementCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const STARTING_BALANCE = 5.0; // cosmetic demo wallet balance, in USDC

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [totalSpentUSD, setTotalSpentUSD] = useState(0);
  const [spentAllTime, setSpentAllTime] = useState(0);
  const [lastDetails, setLastDetails] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, demoMode: true }));
  }, []);

  async function handleSend(text) {
    setMessages((prev) => [...prev, { role: 'trader', text }]);
    setInput('');
    setLoading(true);
    setLedgerEntries([]);

    try {
      const resp = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traderId: 'trader-demo', message: text }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setMessages((prev) => [...prev, { role: 'agent', text: data.error || 'Something went wrong.' }]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'agent', text: data.answer }]);
      setLedgerEntries(data.agentLog || []);
      setTotalSpentUSD(data.totalSpentUSD || 0);
      setSpentAllTime((prev) => prev + (data.totalSpentUSD || 0));
      setLastDetails(data.details || null);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'agent', text: "Couldn't reach the agent backend. Is it running on port 4000?" }]);
    } finally {
      setLoading(false);
    }
  }

  const customs = lastDetails?.customs;
  const fx = lastDetails?.fx;
  const showSettlement = !!customs;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand__mark">
            Pass<span>age</span>
          </span>
          <span className="brand__tagline">the corridor AI agents use to pay for the last mile</span>
        </div>
        <div className="header-right">
          <span className={`badge ${health?.demoMode !== false ? 'badge--demo' : ''}`}>
            {health?.demoMode !== false ? 'Demo mode' : `Live \u2022 ${health?.network}`}
          </span>
          <div className="wallet-chip">
            <span className="wallet-chip__dot" />
            {(STARTING_BALANCE - spentAllTime).toFixed(3)} USDC
          </div>
        </div>
      </header>

      <div className="layout">
        <ChatPanel messages={messages} onSend={handleSend} loading={loading} input={input} setInput={setInput} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AgentLedger entries={ledgerEntries} totalSpentUSD={totalSpentUSD} mode={health?.demoMode !== false ? 'demo' : 'live'} />

          {showSettlement && (
            <div style={{ padding: '0 22px 22px' }}>
              <SettlementCard
                apiUrl={API_URL}
                suggestedAmountUSD={customs.estimatedDutyUSD}
                fxRate={fx?.rate}
                localCurrency={fx?.to}
                reason={`Customs duty at ${customs.crossing}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
