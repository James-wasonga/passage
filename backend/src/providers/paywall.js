import { config } from '../config.js';

/**
 * In live mode, gates `routePath` behind a real x402 payment requirement
 * using x402-express + the public facilitator, charging `price` (e.g. "$0.004")
 * per request to config.providerPayToAddress on Base Sepolia.
 *
 * In demo mode, this is a no-op: the simulated payment already "happened"
 * on the client side (see agent/walletClient.js), so the provider just
 * serves the data. This keeps the provider route handlers identical in
 * both modes - only this one line differs.
 */
export async function applyPaywall(app, routePath, price) {
  if (config.demoMode) return;

  const { paymentMiddleware } = await import('x402-express');
  app.use(
    paymentMiddleware(config.providerPayToAddress, {
      [routePath]: {
        price,
        network: 'base-sepolia',
        config: {
          description: `Passage data provider: ${routePath}`,
        },
      },
    })
  );
}
