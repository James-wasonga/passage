import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../config.js';
import { applyPaywall } from './paywall.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'customsRates.json');

export const customsRouter = Router();

export async function registerCustomsProvider(app) {
  await applyPaywall(app, 'GET /providers/customs', config.prices.customs);
}

customsRouter.get('/providers/customs', async (req, res) => {
  const { crossing = 'busia', goods = 'general', valueUSD = '0' } = req.query;
  const data = JSON.parse(await readFile(dataPath, 'utf8'));

  const crossingInfo = data.crossings[String(crossing).toLowerCase()];
  if (!crossingInfo) {
    return res.status(404).json({
      error: `Unknown crossing "${crossing}"`,
      known: Object.keys(data.crossings),
    });
  }

  const goodsKey = crossingInfo.dutyRatesPct[goods] ? goods : 'general';
  const dutyPct = crossingInfo.dutyRatesPct[goodsKey];
  const value = Number(valueUSD) || 0;
  const estimatedDutyUSD = Math.round(((value * dutyPct) / 100 + data.processingFeeFlatUSD) * 100) / 100;

  res.json({
    provider: 'passage-customs',
    crossing: crossingInfo.name,
    goods: goodsKey,
    dutyRatePct: dutyPct,
    declaredValueUSD: value,
    processingFeeUSD: data.processingFeeFlatUSD,
    estimatedDutyUSD,
    avgQueueMinutes: crossingInfo.avgQueueMinutes,
    updatedAt: data.updatedAt,
    disclaimer: 'Estimate only, based on published tariff bands - actual customs assessment may differ.',
  });
});
