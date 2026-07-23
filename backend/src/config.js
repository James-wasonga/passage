import 'dotenv/config';

/**
 * Passage runs in one of two modes:
 *
 *  DEMO_MODE=true  (default) -> no blockchain keys required at all.
 *    The wallet client simulates signed x402 payments (realistic latency,
 *    realistic-looking tx hashes) and providers accept those simulated
 *    payments. This is what you want for a first run / hackathon demo table.
 *
 *  DEMO_MODE=false -> real x402 flow against Base Sepolia testnet.
 *    Requires WALLET_PRIVATE_KEY (a funded Base Sepolia test wallet, holding
 *    testnet USDC) and BASE_RPC_URL. Providers verify real payments through
 *    the x402 facilitator. See docs/SETUP.md "Going live" section.
 */
const DEMO_MODE = (process.env.DEMO_MODE ?? 'true').toLowerCase() !== 'false';

export const config = {
  demoMode: DEMO_MODE,
  port: Number(process.env.PORT || 4000),

  // Chain config (only required when demoMode = false)
  chain: {
    network: process.env.CHAIN_NETWORK || 'base-sepolia',
    rpcUrl: process.env.BASE_RPC_URL || '',
    usdcAddress: process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
  },

  // Per-provider price in USD (charged as USDC) for a single lookup
  prices: {
    fx: process.env.PRICE_FX || '$0.003',
    customs: process.env.PRICE_CUSTOMS || '$0.006',
    logistics: process.env.PRICE_LOGISTICS || '$0.004',
  },

  // Passage's own revenue: a flat markup added on top of whatever the
  // provider lookups actually cost. This is charged to the trader (or a
  // sponsoring organization) via mobile money, alongside any customs duty -
  // it's how Passage actually earns money, rather than only ever spending
  // it on provider payments. See docs/ARCHITECTURE.md "How Passage earns
  // revenue" for the sponsored-access alternative model.
  serviceFeeUSD: Number(process.env.PASSAGE_SERVICE_FEE_USD || '0.007'),

  // Sponsored access (the "Option A" revenue model): an NGO, SACCO, or
  // trade association can pre-fund a balance. While that balance lasts,
  // Passage waives its service fee entirely for traders - no mobile money
  // prompt at all - and draws the covered amount down from the sponsor
  // balance instead. Once the balance runs out, Passage automatically
  // falls back to charging the normal per-query service fee. Balance is
  // in-memory only (resets on server restart) - fine for a demo, would be
  // a real database in production.
  sponsor: {
    name: process.env.SPONSOR_NAME || '',
    initialBalanceUSD: Number(process.env.SPONSOR_BALANCE_USD || '0'),
  },

  // Receiving address each provider gets paid to (demo mode: cosmetic only)
  providerPayToAddress: process.env.PROVIDER_PAY_TO || '0x9F1c1B9A5b2E9B0e3c8A1d2F4E5D6C7B8A9F0E1D',

  // Optional: Anthropic API key to upgrade the rule-based intent parser
  // to a real LLM call. Entirely optional - the agent works without it.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Mock mobile money off-ramp
  momo: {
    provider: process.env.MOMO_PROVIDER || 'mpesa', // 'mpesa' | 'momo'
    shortcode: process.env.MOMO_SHORTCODE || '174379',
  },

  ledger: {
    contractAddress: process.env.LEDGER_CONTRACT_ADDRESS || '',
  },
};