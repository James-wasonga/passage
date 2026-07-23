import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { fxRouter, registerFxProvider } from './providers/fxProvider.js';
import { customsRouter, registerCustomsProvider } from './providers/customsProvider.js';
import { logisticsRouter, registerLogisticsProvider } from './providers/logisticsProvider.js';
import { chatRouter } from './routes/chat.js';

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Payment gates must be registered before the routers they protect
  // (no-ops in demo mode - see providers/paywall.js).
  await registerFxProvider(app);
  await registerCustomsProvider(app);
  await registerLogisticsProvider(app);

  app.use(fxRouter);
  app.use(customsRouter);
  app.use(logisticsRouter);
  app.use(chatRouter);

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      demoMode: config.demoMode,
      network: config.chain.network,
      prices: config.prices,
    });
  });

  app.listen(config.port, () => {
    console.log('');
    console.log('  Passage backend running');
    console.log(`  http://localhost:${config.port}`);
    console.log(`  mode: ${config.demoMode ? 'DEMO (simulated payments, no keys required)' : 'LIVE (Base Sepolia)'}`);
    console.log('');
  });
}

main();
