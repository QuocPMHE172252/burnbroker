# BurnBroker

**A TEE-Powered Auto-Burn API Broker — Execute once, destroy forever.**

Built for the [Encode Club IC3 Shape Rotator Virtual Hackathon](https://www.encodeclub.com/programmes/shape-rotator-virtual-hackathon).

## Hackathon Details
- **Track:** TEE & AI-Enabled Applications
- **IC3 Research Paper:** [Conditional Recall (arXiv:2510.21904)](https://arxiv.org/abs/2510.21904)
- **Problem Solved:** Long-term exposure and leakage of delegated API keys.

---

## The Problem

When a user delegates their sensitive keys (like a Binance Trading API Key) to a third-party bot or AI agent, they rely purely on the service's "promise" that the key will be deleted after execution. In reality, databases get breached and keys are leaked, leading to millions of dollars in stolen funds.

## The Solution: Conditional Recall via TEE

**BurnBroker** solves this by enforcing a *Game-Theoretic Credible Commitment*.

The user sends their encrypted API credentials into a **Trusted Execution Environment (TEE)**. The enclave executes the requested strategy (e.g., a trade on Binance), then **unconditionally and irreversibly wipes all credentials from RAM**. Finally, it generates a cryptographic attestation proving that the credentials no longer exist.

---

## System Architecture

```
                        +---------------------+
                        |    User Browser      |
                        |  (Next.js Frontend)  |
                        +----------+----------+
                                   |
                          1. Encrypt credentials
                          (Web Crypto AES-256-CBC)
                                   |
                                   v
                        +----------+----------+
                        |   Next.js API Route  |
                        |   POST /api/delegate |
                        +----------+----------+
                                   |
                          2. Decrypt inside TEE
                                   |
                                   v
                        +----------+----------+
                        |   TEE Engine         |
                        |   (tee-engine.ts)    |
                        |                      |
                        |  - Decrypt payload   |
                        |  - Execute strategy  |
                        |    via Binance API   |
                        |  - 0x00 RAM wipe     |
                        |  - Generate          |
                        |    attestation       |
                        +----------+----------+
                                   |
                          3. Real HMAC SHA256
                          signed HTTP request
                                   |
                                   v
                        +----------+----------+
                        |   Binance API        |
                        |   (Testnet / Prod)   |
                        +----------+----------+
                                   |
                          4. Return attestation
                                   |
                                   v
                        +----------+----------+
                        |   Verification Page  |
                        |   /verify            |
                        +----------------------+
```

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| Frontend | `src/app/page.tsx` | Dashboard with task delegation & info market demo |
| TEE Engine | `src/lib/tee-engine.ts` | TEE execution + credential destruction + attestation |
| Exchange Client | `src/lib/exchange-client.ts` | Binance REST API client with HMAC SHA256 signing |
| Enclave Crypto | `src/lib/dstack.ts` | Key derivation and attestation quote generation |
| Client Crypto | `src/lib/crypto.ts` | Client-side AES-256-CBC encryption via Web Crypto API |
| Delegate API | `src/app/api/delegate/route.ts` | POST: execute TEE task; GET: enclave public key |
| Attestation API | `src/app/api/attestation/[id]/route.ts` | Retrieve attestation by task ID |
| Verify Page | `src/app/verify/page.tsx` | Public attestation verification |
| On-chain Storage | `src/components/OnchainAttestation.tsx` | Store attestation hash on Polygon Amoy |
| Registry Contract | `contracts/AttestationRegistry.sol` | Solidity contract for immutable on-chain proof |
| Wallet | `src/components/Providers.tsx` | RainbowKit + wagmi wallet integration |

---

## Features

### 1. End-to-End Encryption
API Key + Secret Key are encrypted client-side using AES-256-CBC (Web Crypto API) before being sent to the server. Decryption only happens inside the TEE enclave.

### 2. Real Binance API Integration
The TEE engine calls the **Binance REST API** (testnet by default) with HMAC SHA256 signed requests:
- **Check Account Balance** — `GET /api/v3/account`
- **Check BTC/USDT Price** — `GET /api/v3/ticker/price`
- **Market Buy BTC** — `POST /api/v3/order` (100 USDT)
- **Market Sell BTC** — `POST /api/v3/order` (100 USDT)
- **View Open Orders** — `GET /api/v3/openOrders`

### 3. Burn Lifecycle
Full TEE lifecycle: decrypt credentials → execute Binance API → 0x00 RAM overwrite of both API Key and Secret Key → null assignment → attestation generation.

### 4. Arrow's Information Paradox Demo
A second tab demonstrates the paper's core application: a buyer inspects information inside the TEE, and if they reject, the TEE provably forgets everything.

### 5. Attestation Verification
Each task generates an attestation with quote, key hash, and proof. Verifiable at `/verify`.

### 6. On-Chain Attestation Storage
After execution, users can store the attestation hash on **Polygon Amoy** via their connected wallet. The hash is immutable — even if the server goes down, the proof remains on-chain forever.

### 7. Wallet Connection
RainbowKit + wagmi integration for Polygon Amoy testnet.

### 8. Live Price Ticker
The navbar shows live **BTC / ETH / BNB** prices (24h change). Data is fetched server-side from Binance when available, with a CoinGecko fallback if Binance is unreachable from the hosting region.

---

## User Guide

How to use BurnBroker in the browser (local or deployed).

### Before you start

1. **Binance Testnet keys (recommended for demos)**  
   - Go to [testnet.binance.vision](https://testnet.binance.vision/) and sign in.  
   - Generate an **API Key** and **Secret Key**.  
   - Enable the permissions your strategy needs (e.g. spot trading for buy/sell).  
   - Use **testnet keys only** when experimenting — never paste production secrets into a demo.

2. **Wallet (optional for delegation, required for on-chain storage)**  
   - **Delegate**, **Info Market**, and **Verify** work without a wallet.  
   - Connect a wallet only if you want to **store the attestation hash on Polygon Amoy** after a successful run.

---

### Tab: Delegate (main flow)

1. Wait until the enclave indicator shows **Simulation** (or **TEE** on real hardware).  
2. Enter your **API Key** and **Secret Key** (testnet).  
3. Choose a **Strategy**:
   - Check Account Balance  
   - Check BTC/USDT Price  
   - Market Buy / Sell BTC (testnet)  
   - View Open Orders  
4. Click **Delegate & Execute**.  
5. Watch the **Execution Monitor**: encrypt → transmit → decrypt → Binance call → wipe → attestation.  
6. When finished, review **Attestation Proof** (task ID, hashes, proof).  
7. Optionally click **Store on-chain** (needs wallet, Amoy MATIC, and `NEXT_PUBLIC_ATTESTATION_CONTRACT` set — see below).

**Emergency Revoke** (while running): stops the demo flow in the UI. For real safety, also **revoke or delete** the API key on Binance if it was exposed.

---

### Tab: Info Market

Demonstrates **Arrow’s Information Paradox**: enter a “seller secret”, simulate inspection inside the TEE, then **Accept & Buy** or **Reject & Forget**. This is a **concept demo**, separate from the Binance delegation flow.

---

### Tab: Verify

1. Copy the **Task ID** from a completed attestation (or pick one from **Load Recent Attestations** if available).  
2. Paste it and click **Verify**.  
3. Inspect status, strategy, enclave mode, logs, and proof.

**Serverless note (e.g. Vercel):** Attestations are stored in **per-instance server memory**, so the API may return “not found” on a different instance than the one that ran your job. After a successful Delegate or Info Market run, the app saves a copy in **`sessionStorage`** in your browser; **Verify** falls back to that so lookup works **in the same tab/session** without a database. For durable, public proof, use **on-chain** storage or another persistence layer.

> A standalone verification page also exists at **`/verify`** with the same purpose.

---

### Tab: About

Read the **Conditional Recall** summary, the **burn pipeline**, research links, and tech tags.

---

### Navbar extras

- **Paper** — link to the research paper.  
- **GitHub** — source code.  
- **Connect** — wallet (for on-chain attestation).  
- **Live prices** — BTC / ETH / BNB ticker (may use a fallback price API).

---

### On-chain attestation (optional)

1. Deploy `AttestationRegistry.sol` (e.g. via Remix) to **Polygon Amoy**.  
2. Set `NEXT_PUBLIC_ATTESTATION_CONTRACT=<address>` in `.env.local` (or Vercel env vars) and redeploy.  
3. Connect wallet to **Polygon Amoy**, fund with test **MATIC** from a faucet.  
4. After delegation completes, use **Store on-chain** and confirm the transaction.

---

## Running Locally

### Requirements
- Node.js >= 18.0.0
- NPM or Yarn

### Database Setup (Neon + Prisma)

BurnBroker now persists attestations in PostgreSQL (recommended: Neon) so Verify works reliably across serverless instances.

1. Create a free Neon project and copy your connection string.
2. Set `DATABASE_URL` in your local `.env` and Vercel environment variables:

```bash
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Create/apply schema on the database:

```bash
npm run db:migrate -- --name init_attestations
```

For production deploys (Vercel CI), use:

```bash
npm run db:deploy
```

Useful DB scripts:

```bash
npm run db:push
npm run db:studio
```

### Get Binance Testnet API Keys
1. Go to [testnet.binance.vision](https://testnet.binance.vision/)
2. Log in with your GitHub account
3. Click **"Generate HMAC_SHA256 Key"**
4. Copy both the **API Key** and **Secret Key** (Secret Key is shown only once)

Testnet provides free virtual funds (BTC, USDT, ETH) for testing.

### Start
```bash
git clone https://github.com/QuocPMHE172252/burnbroker.git
cd burnbroker
npm install
npm run dev
```

Open `http://localhost:3000`, enter your Binance testnet API Key + Secret Key, choose a strategy, and click **Delegate & Execute**.

### Deploy AttestationRegistry Contract (Optional)

To enable on-chain attestation storage:

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Create a new file, paste the contents of `contracts/AttestationRegistry.sol`
3. Compile with Solidity 0.8.19+
4. Connect MetaMask to **Polygon Amoy** testnet ([get free MATIC](https://faucet.polygon.technology/))
5. Deploy the contract
6. Copy the deployed contract address
7. Create `.env.local` in the project root:

```
NEXT_PUBLIC_ATTESTATION_CONTRACT=0xYourContractAddressHere
```

8. Restart the dev server — the "Store on-chain" button will appear after each attestation

### Pages
- `/` — Main app: **Delegate**, **Info Market**, **Verify**, and **About** tabs (plus live price ticker in the navbar)
- `/verify` — Standalone attestation verification page (same flow as the **Verify** tab)

---

## Paper Mapping

| Paper Concept | Implementation |
|---------------|----------------|
| Credible Commitment to Forget | TEE engine with 0x00 RAM overwrite after real Binance API execution |
| Arrow's Information Paradox | Info Market tab: inspect-then-forget flow |
| Remote Attestation | Attestation with quote, key hash, and proof |
| One-Shot Delegation | User delegates credentials for a single strategy, destroyed immediately after |
| Game-Theoretic Efficiency | Two-mode demo: API key delegation + information market |

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Animations:** Framer Motion
- **Wallet:** wagmi, viem, RainbowKit
- **Exchange:** Binance REST API (Testnet + Production), HMAC SHA256 signing
- **TEE:** Custom TEE engine with enclave simulation
- **Crypto:** Web Crypto API (AES-256-CBC), Node.js crypto (HMAC SHA256)

---

## Future Roadmap
- [x] Real Binance API integration (testnet + production)
- [ ] Deploy TEE engine to production hardware enclave (Intel TDX / SGX)
- [ ] Implement zkTLS to prove exchange data source
- [ ] On-chain attestation storage with tx hash verification
- [ ] Support more exchanges (Bybit, OKX, Coinbase)

---

## Submission Checklist

- [x] Project builds and runs locally
- [x] Real client-side encryption (Web Crypto API)
- [x] TEE execution with credential destruction
- [x] Real Binance API integration (testnet)
- [x] Attestation generation and verification
- [x] On-chain attestation storage (Polygon Amoy)
- [x] Arrow's Information Paradox demo
- [x] Wallet connection (RainbowKit)
- [x] Paper concepts explained in UI
- [ ] Demo video recorded
