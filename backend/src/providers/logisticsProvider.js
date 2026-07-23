import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../config.js';
import { applyPaywall } from './paywall.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'logisticsRates.json');

export const logisticsRouter = Router();

export async function registerLogisticsProvider(app) {
  await applyPaywall(app, 'GET /providers/logistics', config.prices.logistics);
}

logisticsRouter.get('/providers/logistics', async (req, res) => {
  const { route = 'busia_kampala', weightKg = '20', vehicle = 'boda_boda' } = req.query;
  const data = JSON.parse(await readFile(dataPath, 'utf8'));

  const distanceKm = data.corridorDistancesKm[route];
  if (!distanceKm) {
    return res.status(404).json({
      error: `Unknown route "${route}"`,
      known: Object.keys(data.corridorDistancesKm),
    });
  }

  const surchargePct = data.vehicleSurchargePct[vehicle] ?? data.vehicleSurchargePct.pickup;
  const weight = Number(weightKg) || 1;
  const base = Math.max(data.minimumFareUSD, weight * distanceKm * data.ratePerKgPerKmUSD);
  const quoteUSD = Math.round(base * (1 + surchargePct / 100) * 100) / 100;

  res.json({
    provider: 'passage-logistics',
    route,
    distanceKm,
    weightKg: weight,
    vehicle,
    quoteUSD,
    updatedAt: data.updatedAt,
  });
});
