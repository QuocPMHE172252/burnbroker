# BurnBroker (BurnBroker)

**A TEE-Powered Auto-Burn API Broker designed for the Encode Club IC3 Shape Rotator Virtual Hackathon.**

[Demo Video Link] <!-- Insert Video Link Here -->

## Hackathon Details
- **Track:** TEE & AI-Enabled Applications
- **IC3 Research Paper Validated:** [Conditional Recall (arXiv:2510.21904)](https://arxiv.org/abs/2510.21904)
- **Problem Solved:** Long-term exposure and leakage of delegated API keys.

---

## The Problem

When a user delegates their sensitive keys (like a Binance Trading REST API Key) to a third-party Bot or AI Agent, they rely purely on the service's "promise" that the key will be deleted after execution. In reality, databases get breached, and keys are leaked leading to millions of dollars in stolen funds.

## The Solution: Conditional Recall via TEE

**BurnBroker** solves this by enforcing a *Game-Theoretic Credible Commitment*.

Instead of entrusting the key to a traditional backend server, the user sends their encrypted API Key strictly into a **Trusted Execution Environment (TEE)** - specifically targeting the **Phala Network Phat Contracts** or **Dstack**.

The Enclave executes the requested strategy (e.g., executing a trade), and then **unconditionally and irreversibly wipes the API key from RAM**. Finally, it generates a cryptographic hardware attestation proving that the key no longer exists on this physical machine.

---

## System Architecture

```
                        +---------------------+
                        |    User Browser      |
                        |  (Next.js Frontend)  |
                        +----------+----------+
                                   |
                          1. Encrypt API Key
                          (Web Crypto AES-256-CBC)
                                   |
                                   v
                        +----------+----------+
                        |   Next.js API Route  |
                        |   POST /api/delegate |
                        +----------+----------+
                                   |
                          2. Decrypt inside
                          TEE simulation
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
                        |  - Generate HW       |
                        |    attestation       |
                        +----------+----------+
                                   |
                          2b. Real HTTP call
                          (HMAC SHA256 signed)
                                   |
                                   v
                        +----------+----------+
                        |   Binance API        |
                        |   (Testnet/Prod)     |
                        +----------+----------+
                                   |
                          3. Return attestation
                                   |
                                   v
                        +----------+----------+
                        |   Attestation Store  |
                        |   GET /api/attest/id |
                        +----------+----------+
                                   |
                          4. Verify at /verify
                                   |
                                   v
                        +----------+----------+
                        |   Verification Page  |
                        |   (verify/page.tsx)  |
                        +----------------------+
```

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| Frontend | `src/app/page.tsx` | Dashboard with task delegation & info market demo |
| TEE Engine | `src/lib/tee-engine.ts` | Server-side TEE execution + key destruction + attestation |
| Exchange Client | `src/lib/exchange-client.ts` | Binance REST API client with HMAC SHA256 signing |
| Dstack Client | `src/lib/dstack.ts` | Dstack TEE integration (simulator + production) |
| Crypto | `src/lib/crypto.ts` | Client-side AES-256-CBC encryption via Web Crypto API |
| Delegate API | `src/app/api/delegate/route.ts` | POST: execute TEE task; GET: enclave public key |
| Attestation API | `src/app/api/attestation/[id]/route.ts` | Retrieve attestation by task ID |
| Verify Page | `src/app/verify/page.tsx` | Public attestation verification |
| Phala Contract | `phala-tee/src/index.ts` | Production Phala Phat Contract |
| On-chain Consumer | `phala-tee/contracts/OracleConsumerContract.sol` | Solidity contract for on-chain attestation |
| Wallet | `src/components/Providers.tsx` | RainbowKit + wagmi wallet integration |

---

## Features

### 1. Real Encryption Flow
API keys (API Key + Secret Key) are encrypted client-side using AES-256-CBC (Web Crypto API) before being sent to the server. The server decrypts inside the TEE context only.

### 2. Real Binance API Integration
The TEE engine calls the **Binance REST API** (testnet by default) with HMAC SHA256 signed requests. Supported strategies:
- **Check Account Balance** — `GET /api/v3/account`
- **Check BTC/USDT Price** — `GET /api/v3/ticker/price`
- **Market Buy BTC** — `POST /api/v3/order` (MARKET BUY 100 USDT)
- **Market Sell BTC** — `POST /api/v3/order` (MARKET SELL 100 USDT)
- **View Open Orders** — `GET /api/v3/openOrders`

### 3. TEE Burn Lifecycle
The `/api/delegate` route runs the full TEE lifecycle: decrypt credentials → execute Binance API call → 0x00 RAM overwrite of both API Key and Secret Key → null assignment → attestation generation.

### 4. Arrow's Information Paradox Demo
A second tab demonstrates the paper's core application: a buyer inspects information inside the TEE, and if they reject, the TEE provably forgets everything.

### 5. Hardware Attestation Verification
Each task generates an attestation with hardware quote, key hash, and proof. Attestations can be verified at `/verify`.

### 6. Wallet Connection
RainbowKit + wagmi integration for Polygon Amoy testnet. Ready for on-chain attestation storage.

### 7. Game Theory Explainer
The UI includes a "How Conditional Recall Works" section mapping features directly to the paper's framework.

---

## Running Locally

### Requirements
- Node.js >= 18.0.0
- NPM or Yarn

### Get Binance Testnet API Keys
1. Go to [testnet.binance.vision](https://testnet.binance.vision/)
2. Log in with your GitHub account
3. Click **"Generate HMAC_SHA256 Key"**
4. Copy both the **API Key** and **Secret Key** (Secret Key is shown only once)

Testnet provides free virtual funds (BTC, USDT, ETH) for testing.

### Start (Simulation Mode)
```bash
git clone https://github.com/QuocPMHE172252/burnbroker.git
cd burnbroker
npm install
npm run dev
```

Open `http://localhost:3000`, enter your Binance testnet API Key + Secret Key, choose a strategy, and click **Delegate & Execute**.

### Start (TEE Mode with Dstack Simulator)

Run the local Dstack simulator in a separate terminal, then start the app with the endpoint:

```bash
# Terminal 1: Start the Dstack simulator
npm run simulator

# Terminal 2: Start the app pointing to the simulator
# Linux/Mac:
DSTACK_SIMULATOR_ENDPOINT=http://localhost:8090 npm run dev
# Windows PowerShell:
$env:DSTACK_SIMULATOR_ENDPOINT="http://localhost:8090"; npm run dev
```

The app will detect the simulator and switch to **TEE mode**, using KMS-derived keys and generating Dstack-compatible attestation quotes.

### Deploy to Phala Cloud (Production TEE)

```bash
docker build -t quocpm/burnbroker:latest .
docker push quocpm/burnbroker:latest
phala deploy -c docker-compose.yaml -n burnbroker
```

In production, the app automatically connects to the real Dstack guest agent via `/var/run/dstack.sock` with Intel TDX hardware attestation.

### Pages
- `/` — Main dashboard (Key Delegation + Info Market tabs)
- `/verify` — Attestation verification page

---

## Paper Mapping

| Paper Concept | Implementation |
|---------------|----------------|
| Credible Commitment to Forget | TEE engine with 0x00 RAM overwrite and null assignment after real Binance API execution |
| Arrow's Information Paradox | Info Market tab: inspect-then-forget flow |
| Remote Attestation | Hardware attestation with quote, key hash, and proof |
| AI Agents in TEEs | Phala Phat Contract integration |
| One-Shot Delegation | User delegates API key for a single strategy execution, key is destroyed immediately after |
| Game-Theoretic Efficiency | Two-mode demo showing both API key delegation and info market use cases |

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Animations:** Framer Motion
- **Wallet:** wagmi, viem, RainbowKit
- **Exchange:** Binance REST API (Testnet + Production), HMAC SHA256 signing
- **TEE:** Phala Network Phat Contracts, Dstack SDK, custom TEE engine
- **Blockchain:** Solidity 0.8.x, Hardhat, Polygon Amoy
- **Crypto:** Web Crypto API (AES-256-CBC), Node.js crypto

---

## Future Roadmap
- [x] Real Binance API integration inside TEE (testnet + production)
- [ ] Migrate TEE engine to production SGX enclave via Dstack `compose.yaml`
- [ ] Implement zkTLS to prove exchange data source into the enclave
- [ ] On-chain attestation storage with tx hash verification
- [ ] Expand from trading bots to Multi-sig DAO Execution Proxy
- [ ] Support more exchanges (Bybit, OKX, Coinbase)

---

## Submission Checklist

- [x] Project builds and runs locally
- [x] Real client-side encryption (Web Crypto API)
- [x] Server-side TEE execution with key destruction
- [x] Real Binance API integration (testnet)
- [x] Hardware attestation generation
- [x] Attestation verification page
- [x] Arrow's Information Paradox demo
- [x] Wallet connection (RainbowKit)
- [x] Paper concepts explained in UI
- [x] Phala Phat Contract code
- [x] On-chain consumer contract (Solidity)
- [ ] Demo video recorded
- [ ] Deployed to production
