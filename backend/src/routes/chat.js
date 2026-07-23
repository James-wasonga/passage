import { Router } from 'express';
import { handleTraderQuery } from '../agent/orchestrator.js';
import { initiateMomoSettlement } from '../offramp/momoOfframp.js';

export const chatRouter = Router();

chatRouter.post('/api/chat', async (req, res) => {
  const { traderId = 'trader-demo', message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message (string) is required' });
  }

  try {
    const result = await handleTraderQuery({ traderId, message });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Agent failed to complete the query', detail: String(err?.message || err) });
  }
});

chatRouter.post('/api/settle', async (req, res) => {
  const { phoneNumber, amountUSD, fxRateUsedToLocal, localCurrency, reason } = req.body || {};
  if (!phoneNumber || !amountUSD) {
    return res.status(400).json({ error: 'phoneNumber and amountUSD are required' });
  }

  try {
    const receipt = await initiateMomoSettlement({ phoneNumber, amountUSD, fxRateUsedToLocal, localCurrency, reason });
    res.json(receipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Settlement failed', detail: String(err?.message || err) });
  }
});
