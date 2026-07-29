# Architecture

## The problem, concretely

A small trader moving goods across an East African border corridor (e.g. Kenya-Uganda)
needs several pieces of information per trip: today's real exchange rate, an estimate of
customs duty for their goods, and a last-mile delivery quote once they're across. Each of
these could be served by a different small provider, but no existing payment rail lets an
automated buyer pay a fraction of a cent per lookup - card processing fees alone exceed the
charge. The trader also, in the common case, has no bank account or card - only a basic
phone and mobile money.

## The flow

```
 Trader (chat)
        |
        v
  Passage Agent  ───────────────►  FX Rate Provider     ($0.003, x402/USDC on Base)
  (orchestrator)  ───────────────►  Customs Provider     ($0.006, x402/USDC on Base)
        |         ───────────────►  Logistics Provider   ($0.004, x402/USDC on Base)
        |
        v
  Composed plain-language answer
        |
        v (only if a payout/settlement is actually needed)
  Mobile money off-ramp (M-Pesa/MoMo-style) ───────────► Trader's phone
        |
        v
  PassageLedger (on-chain, optional) ─── audit trail: hash, amount, provider count
```

The trader-facing side never touches crypto. The agent-to-agent side never touches mobile
money. Passage is the bridge between the two.

## Why x402 specifically

x402 revives the HTTP `402 Payment Required` status code: a provider responds to an unpaid
request with `402` and payment instructions, the client signs a payment authorization
(EIP-3009 `transferWithAuthorization` for USDC) and retries the request with a payment
header, and a facilitator verifies + settles on-chain. No accounts, no subscriptions, no
manual approval per request - which is exactly what's needed for an agent making several
lookups per trader query, each costing fractions of a cent. Base's sub-cent transaction
fees are what make metering at this granularity viable at all.

## Two modes, one codebase

- **Demo mode** (`DEMO_MODE=true`, default): `agent/walletClient.js` simulates the entire
  handshake - realistic latency, a realistic-looking (but fake) transaction hash - and the
  provider routes serve data directly with no real payment gate. This means anyone can run
  the whole thing with zero external accounts.
- **Live mode** (`DEMO_MODE=false`): the exact same provider route handlers are wrapped in
  real `x402-express` payment middleware (see `providers/paywall.js`), and the agent calls
  them through real `x402-fetch` + a `viem` wallet client against Base Sepolia. Only one
  file (`walletClient.js`) and one middleware call per provider differ between the two
  modes - the orchestration, intent parsing, and UI are identical either way.

This was a deliberate choice: hackathon judges (and you, iterating quickly) should be able
to run the full experience with `npm install && npm run dev` and nothing else, while the
live-payment code path is genuinely wired up and ready to demo on request.

## Components

- **`backend/src/agent/orchestrator.js`** - the core agent loop: parse intent, decide which
  providers are needed, pay + call them in parallel, compose one answer, record the
  settlement.
- **`backend/src/agent/intentParser.js`** - rule-based extraction of border crossing, goods
  type, value, weight, and vehicle from free text, with an optional upgrade path to a real
  Claude API call if `ANTHROPIC_API_KEY` is set (not required).
- **`backend/src/providers/*`** - three independent "sellers" in the x402 sense, each
  serving one kind of data from a small local dataset (`backend/src/data/*.json`).
- **`backend/src/offramp/momoOfframp.js`** - the human-facing settlement leg. Mocked by
  default; structured so swapping in a real M-Pesa Daraja STK Push or MTN MoMo call is a
  contained change to this one file.
- **`backend/src/ledger/ledgerClient.js`** - always logs locally; additionally writes
  on-chain via `PassageLedger.sol` when a contract address is configured.
- **`contracts/contracts/PassageLedger.sol`** - minimal on-chain audit trail: records a hash
  of each interaction, the amount spent, and provider count, and exposes a per-agent
  lifetime-volume view function that could seed an agent reputation system.
- **`frontend/`** - a chat UI (the trader's side) alongside a live "Toll Ledger" (the
  agent's side), so a judge can see both halves of the transaction at once instead of
  trusting a black box.

## Production roadmap

- LLM-backed intent parsing can be enabled for richer language understanding. The current rule-based parser was intentionally chosen for deterministic behavior, low latency, and near-zero operating cost during the hackathon.
- A real facilitator SLA / rate limits instead of the public `x402.org` facilitator.
- Real Daraja/MoMo credentials and KYC-appropriate settlement flows instead of the mock
  off-ramp.
- Provider onboarding (today's three providers are illustrative; in production, third
  parties would register their own x402-gated endpoints).
- Spending policy enforcement on the agent wallet (per-query cap, daily cap) before letting
  it pay providers unattended.
