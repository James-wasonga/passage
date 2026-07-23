import { appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, '..', '..', 'var');
const logFile = path.join(logDir, 'ledger.log.jsonl');

let contractPromise = null;

async function getContract() {
  if (contractPromise) return contractPromise;
  contractPromise = (async () => {
    const { createWalletClient, http, createPublicClient } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const { baseSepolia } = await import('viem/chains');
    const { abi } = await import('../../../contracts/artifacts/PassageLedger.abi.js');

    const account = privateKeyToAccount(config.chain.walletPrivateKey);
    const wallet = createWalletClient({ account, transport: http(config.chain.rpcUrl || undefined), chain: baseSepolia });
    const publicClient = createPublicClient({ transport: http(config.chain.rpcUrl || undefined), chain: baseSepolia });
    return { wallet, publicClient, abi, account };
  })();
  return contractPromise;
}

/**
 * Records a completed trader interaction: how many provider payments were
 * made, the total spent, and a hash of the query/answer for auditability.
 *
 * demo mode / no contract configured -> appended to a local JSONL file
 * (var/ledger.log.jsonl) so you can still show "here's the audit trail".
 *
 * live mode + LEDGER_CONTRACT_ADDRESS set -> also writes an on-chain entry
 * to the PassageLedger contract (see contracts/contracts/PassageLedger.sol).
 */
export async function recordSettlement(entry) {
  const record = { ...entry, recordedAt: new Date().toISOString() };

  await mkdir(logDir, { recursive: true });
  await appendFile(logFile, `${JSON.stringify(record)}\n`, 'utf8');

  if (!config.demoMode && config.ledger.contractAddress) {
    try {
      const { wallet, account } = await getContract();
      const { abi } = await import('../../../contracts/artifacts/PassageLedger.abi.js');
      const queryHash = `0x${Buffer.from(JSON.stringify(entry)).toString('hex').slice(0, 64).padEnd(64, '0')}`;
      const txHash = await wallet.writeContract({
        address: config.ledger.contractAddress,
        abi,
        functionName: 'recordSettlement',
        args: [queryHash, BigInt(Math.round(entry.totalSpentUSD * 1_000_000)), BigInt(entry.providerCount || 0)],
        account,
      });
      record.onChainTx = txHash;
    } catch (err) {
      record.onChainError = String(err?.message || err);
    }
  }

  return record;
}
