import { config } from '../config.js';

// In-memory only, by design: this is the simplest possible implementation
// of "an NGO/SACCO deposits a balance, Passage draws it down instead of
// charging traders." A real deployment would back this with a database
// (and likely per-sponsor, per-corridor balances) - this is enough to
// demonstrate the business model end to end.
let balanceUSD = config.sponsor.initialBalanceUSD;

export function getSponsorStatus() {
  return {
    configured: Boolean(config.sponsor.name) && config.sponsor.initialBalanceUSD > 0,
    name: config.sponsor.name || null,
    remainingBalanceUSD: Math.round(balanceUSD * 10000) / 10000,
  };
}

/**
 * Attempts to cover `amountUSD` from the sponsor balance. Returns true and
 * deducts the balance if there's enough left; returns false (balance
 * untouched) otherwise - callers should fall back to charging the trader
 * directly when this returns false.
 */
export function trySponsor(amountUSD) {
  if (!config.sponsor.name) return false;
  if (balanceUSD < amountUSD) return false;
  balanceUSD -= amountUSD;
  return true;
}