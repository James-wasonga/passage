# Setup Guide

This covers three things, in order: running the demo (no keys needed), going live on Base
Sepolia testnet, and deploying/using the PassageLedger contract.

## 0. Prerequisites

- Node.js 18.17 or newer (`node -v`)
- npm (comes with Node)
- Git (to clone/push if you're submitting to GitHub)

## 1. Run the demo (recommended first step)

This mode simulates the x402 payment handshake with realistic timing and receipts. No
wallet, no testnet funds, no API keys of any kind.

```bash
cd backend
cp .env.example .env        # defaults are already demo-ready, no edits required
npm install
npm run dev
```

You should see:

```
  Passage backend running
  http://localhost:4000
  mode: DEMO (simulated payments, no keys required)
```

In a second terminal:
  
```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). Try one of the suggestion chips, or
type something like:

> Crossing at Busia today with electronics worth $800, need it delivered 30kg by truck to Kampala

Watch the right-hand "Toll Ledger" print a ticket for each provider the agent pays
(FX rate, customs estimate, logistics quote), then try "Settle via mobile money" with any
phone number to see the mocked M-Pesa-style confirmation.

### Quick sanity check via curl (optional)

```bash
curl http://localhost:4000/api/health

curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"traderId":"trader-1","message":"crossing at busia with electronics worth 800 usd"}'
```

## 2. Going live on Base Sepolia

This switches real payments on: your backend's wallet actually pays USDC to the provider
address for every lookup, verified through the public x402 facilitator.

### 2.1 Get a testnet wallet + funds

1. Generate a fresh EVM private key you're comfortable using for testing (e.g. via
   `cast wallet new` from Foundry, or any wallet's "create new account" flow). **Never use
   a wallet that holds real funds for this.**
2. Fund it with Base Sepolia ETH (for gas) from a faucet, e.g. the Coinbase Developer
   Platform faucet or `https://www.alchemy.com/faucets/base-sepolia`.
3. Get testnet USDC on Base Sepolia. The Coinbase Developer Platform faucet issues both ETH
   and USDC for Base Sepolia in one place.

### 2.2 Configure the backend

Edit `backend/.env`:

```bash
DEMO_MODE=false
BASE_RPC_URL=https://sepolia.base.org
WALLET_PRIVATE_KEY=0xyour_testnet_private_key
PROVIDER_PAY_TO=0xan_address_you_control_to_receive_provider_payments
```

Restart the backend (`npm run dev`). The console should now say:

```
  mode: LIVE (Base Sepolia)
```

### 2.3 Try it

Run the same chat query as before. This time, each ticket in the Toll Ledger carries a real
Base Sepolia transaction hash you can look up on
[Base Sepolia Basescan](https://sepolia.basescan.org).

> The public facilitator at `https://x402.org/facilitator` (already the default) handles
> verification and settlement for you &mdash; you don't need to run your own facilitator.

## 3. The PassageLedger smart contract (optional, for on-chain audit trail)

The app works fully without this &mdash; settlements are always logged locally to
`backend/var/ledger.log.jsonl`. Deploying the contract additionally writes a public,
on-chain record of every settlement (a hash of the query, the amount, and how many
providers were paid) for independent auditability.

```bash
cd contracts
cp .env.example .env
# Edit .env: WALLET_PRIVATE_KEY (same testnet key as above works fine) and BASE_RPC_URL

npm install
npm run compile          # first run downloads the solc 0.8.24 compiler - needs normal internet access
npm test                 # runs the included Hardhat tests on a local chain
npm run deploy:sepolia
```

You'll see output like:

```
PassageLedger deployed to: 0xAbC123...
```

Copy that address into `backend/.env`:

```bash
LEDGER_CONTRACT_ADDRESS=0xAbC123...
```

Restart the backend. Settlements will now also be written on-chain (visible in the backend
console as `onChainTx` in each ledger record, and returned in the API response).

If you ever change `PassageLedger.sol`, re-run `npm run compile` then
`npm run export-abi` inside `contracts/` to refresh the ABI the backend imports from
`contracts/artifacts/PassageLedger.abi.js`.

## 4. Deploying for a live demo (not just localhost)

For hackathon judging you can usually get away with localhost + screen share, but if you
want a real URL:

- **Backend:** any Node host works (Railway, Render, Fly.io, a VPS). Set the same env vars
  as above. Expose port `4000` (or set `PORT`).
- **Frontend:** `npm run build` in `frontend/` produces a static `dist/` folder deployable
  to Vercel, Netlify, or Cloudflare Pages. Set `VITE_API_URL` to your deployed backend's URL
  at build time, e.g. `VITE_API_URL=https://your-backend.example.com npm run build`.

## Troubleshooting

- **"Couldn't reach the agent backend"** in the UI &mdash; the backend isn't running, or
  `VITE_API_URL` doesn't match where it's actually listening. Check `http://localhost:4000/api/health`
  directly in a browser.
- **Contract compile fails with a download error** &mdash; your network is blocking
  `binaries.soliditylang.org`. Try again from a normal network connection (this is common in
  sandboxed CI environments but not on a regular laptop).
- **Live mode: "DEMO_MODE is false but WALLET_PRIVATE_KEY is not set"** &mdash; you flipped
  `DEMO_MODE=false` without filling in the rest of the "Going live" section above. Either
  fill in the wallet key, or set `DEMO_MODE=true` again.
- **Live mode: payments fail / insufficient funds** &mdash; check your testnet wallet
  actually holds both Base Sepolia ETH (for gas) and testnet USDC, and that
  `PROVIDER_PAY_TO` is a valid address you control.
