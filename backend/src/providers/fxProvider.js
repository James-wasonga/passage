import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../config.js';
import { applyPaywall } from './paywall.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'fxRates.json');

export const fxRouter = Router();

export async function registerFxProvider(app) {
  await applyPaywall(app, 'GET /providers/fx', config.prices.fx);
}

fxRouter.get('/providers/fx', async (req, res) => {
  const { from = 'USD', to = 'KES' } = req.query;
  const data = JSON.parse(await readFile(dataPath, 'utf8'));

  let rate;
  if (from === 'USD' && data.rates[to]) {
    rate = data.rates[to];
  } else if (to === 'USD' && data.rates[from]) {
    rate = 1 / data.rates[from];
  } else {
    const key = `${from}_${to}`;
    const inverseKey = `${to}_${from}`;
    if (data.crossRates[key]) rate = data.crossRates[key];
    else if (data.crossRates[inverseKey]) rate = 1 / data.crossRates[inverseKey];
    else if (data.rates[from] && data.rates[to]) rate = data.rates[to] / data.rates[from];
  }

  if (!rate) {
    return res.status(404).json({ error: `No rate available for ${from} -> ${to}` });
  }

  res.json({
    provider: 'passage-fx',
    from,
    to,
    rate,
    updatedAt: data.updatedAt,
    note: 'Interbank-referenced rate, not a street/kiosk rate.',
  });
});
