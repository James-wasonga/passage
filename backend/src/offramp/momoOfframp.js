import { config } from '../config.js';

function randomRef(prefix) {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  let out = prefix;
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Simulates the human-facing side of a settlement: the trader gets a
 * mobile money prompt on their phone and confirms with their PIN, exactly
 * like a normal M-Pesa STK Push or MTN MoMo request - no wallet, no seed
 * phrase, nothing crypto-shaped ever reaches them.
 *
 * This is intentionally mocked (no real Daraja/MTN credentials required)
 * so the whole demo runs with zero external accounts. Swapping this for a
 * real Daraja STK Push call is a drop-in change - see docs/SETUP.md.
 */
export async function initiateMomoSettlement({ phoneNumber, amountUSD, fxRateUsedToLocal, localCurrency, reason }) {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

  const localAmount = Math.round(amountUSD * (fxRateUsedToLocal || 1) * 100) / 100;

  return {
    provider: config.momo.provider,
    status: 'confirmed',
    phoneNumber: maskPhone(phoneNumber),
    amountUSD,
    localAmount,
    localCurrency: localCurrency || 'local currency',
    reason,
    checkoutRequestId: randomRef(config.momo.provider === 'mpesa' ? 'ws_CO_' : 'momo_'),
    receiptNumber: randomRef('PSG'),
    settledAt: new Date().toISOString(),
  };
}

function maskPhone(phone) {
  if (!phone) return 'unknown';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}
