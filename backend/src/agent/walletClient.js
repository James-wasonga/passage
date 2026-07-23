import { config } from '../config.js';

/**
 * fetchWithPayment(url, options) -> { response, receipt }
 *
 * In demo mode this never touches a real chain: it simulates the two-step
 * x402 handshake (request -> 402 -> pay -> retry -> 200) with realistic
 * timing and a deterministic-looking fake tx hash, so the rest of the app
 * (agent orchestration, UI) can be built and demoed against real behavior
 * without needing testnet funds or API keys.
 *
 * In live mode it delegates to viem + x402-fetch against Base Sepolia.
 */

function randomHex(len) {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function simulatedTxHash() {
  return `0x${randomHex(64)}`;
}

async function demoFetchWithPayment(url, options, priceUSD) {
  // Simulate the initial unpaid request that would receive a 402.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

  // Simulate signing + broadcasting an EIP-3009 transferWithAuthorization
  // and the facilitator settling it on Base Sepolia.
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 350));

  const response = await fetch(url, options);
  const receipt = {
    mode: 'demo',
    network: 'base-sepolia (simulated)',
    amountUSD: priceUSD,
    txHash: simulatedTxHash(),
    payTo: config.providerPayToAddress,
    settledAt: new Date().toISOString(),
  };
  return { response, receipt };
}

let liveClientPromise = null;

async function getLiveWalletClient() {
  if (liveClientPromise) return liveClientPromise;
  liveClientPromise = (async () => {
    const { createWalletClient, http } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const { baseSepolia } = await import('viem/chains');
    const { wrapFetchWithPayment } = await import('x402-fetch');

    if (!config.chain.walletPrivateKey) {
      throw new Error(
        'DEMO_MODE is false but WALLET_PRIVATE_KEY is not set. See docs/SETUP.md "Going live".'
      );
    }

    const account = privateKeyToAccount(config.chain.walletPrivateKey);
    const walletClient = createWalletClient({
      account,
      transport: http(config.chain.rpcUrl || undefined),
      chain: baseSepolia,
    });

    const fetchWithPay = wrapFetchWithPayment(fetch, walletClient);
    return { fetchWithPay, address: account.address };
  })();
  return liveClientPromise;
}

async function liveFetchWithPayment(url, options, priceUSD) {
  const { fetchWithPay, address } = await getLiveWalletClient();
  const response = await fetchWithPay(url, options);

  // x402-fetch settles the payment as part of resolving the response; the
  // settlement details are also observable via the X-PAYMENT-RESPONSE header
  // per the x402 spec, when the provider echoes it back.
  const paymentHeader = response.headers.get('x-payment-response');
  let onchain = null;
  if (paymentHeader) {
    try {
      onchain = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
    } catch {
      onchain = { raw: paymentHeader };
    }
  }

  const receipt = {
    mode: 'live',
    network: config.chain.network,
    amountUSD: priceUSD,
    txHash: onchain?.transaction || onchain?.txHash || 'settled (see facilitator)',
    payer: address,
    payTo: config.providerPayToAddress,
    settledAt: new Date().toISOString(),
  };
  return { response, receipt };
}

export async function fetchWithPayment(url, options, priceUSD) {
  if (config.demoMode) {
    return demoFetchWithPayment(url, options, priceUSD);
  }
  return liveFetchWithPayment(url, options, priceUSD);
}
