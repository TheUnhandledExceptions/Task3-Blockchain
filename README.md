# 🛡️ Autonomous Forensic Attestation Pipeline (HH Goa 2026 - Task 3)

An enterprise-grade OSINT pipeline that takes a raw face image, autonomously identifies the exact source on social media, freezes the evidence to a decentralized network, and notarizes the discovery on an EVM blockchain.

## 🚀 The Unique Selling Propositions (USPs)

### USP 1: Dual-Layer Tamper Resistance (Solving the Compression Paradox)
Standard reverse-image pipelines fail because social platforms aggressively compress images (WebP conversions, EXIF stripping). A simple `SHA-256` of a downloaded image breaks instantly upon verification.
This project uses a **Dual-Layer Attestation**:
* **Layer A (Transport Proof):** SHA-256 of the raw discovered URL and timestamp.
* **Layer B (Invariant Proof):** A 64-bit Perceptual Hash (pHash) combined with a 128-dimensional biometric vector commitment. 
Even if Instagram compresses the image, the biometric and perceptual hashes remain stable, proving the identity inextricably belongs to the URL.

### USP 2: The IPFS 404-Shield (Decentralized Evidence Vault)
If a bad actor deletes their social media post, standard blockchain records point to a `404 Not Found` URL, destroying the evidence. 
The instant this pipeline discovers a post, it freezes the raw evidence and uploads it to the **InterPlanetary File System (IPFS)** via Pinata. The permanent `ipfs://` CID is written to the blockchain, ensuring the evidence survives even if the original platform goes offline.

### USP 3: Blinded Biometric Privacy (GDPR-Safe)
Storing raw facial vectors on a public ledger is a severe privacy violation. This pipeline utilizes a **Blinded Biometric Commitment scheme**. The 128-dimensional facial embedding is mathematically blinded using Keccak256 before being sent to the EVM. The public ledger only sees cryptographic noise, verifying identity without leaking Personally Identifiable Information (PII).

## 🏗️ Architecture

1. **The Python Chef (Computer Vision):** Uses OpenCV's DNN (YuNet) to detect faces, extract a 128-d biometric feature vector, and calculate a perceptual hash. It intelligently resizes the full image to bypass search API limits while maintaining context.
2. **The TypeScript Orchestrator:** Hits the **SerpApi (Google Lens)** engine to discover the canonical social media post, pins the evidence to IPFS, and signs the EIP-712 style transaction.
3. **The EVM Vault:** A Solidity smart contract (deployed on Anvil / Polygon Amoy) that permanently stores the dual-layer fingerprints and the IPFS CID.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+) | Python (3.10+) | Foundry (Forge, Anvil, Cast)

### Setup Steps
1. **Install Dependencies:**
   ```bash
   npm install
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables (.env):**
   ```env
   SERPAPI_API_KEY=your_serpapi_key
   PINATA_JWT=your_pinata_jwt
   AMOY_RPC_URL=http://127.0.0.1:8545
   PRIVATE_KEY=your_testnet_or_anvil_private_key
   REGISTRY_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

3. **Start Local EVM & Deploy Vault:**
   ```bash
   anvil
   
   # In a new terminal:
   forge script contracts/script/DeployRegistry.s.sol:DeployRegistry --rpc-url http://127.0.0.1:8545 --broadcast
   ```

## 💻 Usage & Live Tamper Demo

### 1. Standard Evidence Processing (The Happy Path)
```bash
npx tsx src/index.ts images/test_image.png
```
**Under the Hood:**
* **CV Extraction:** We execute `src/python/face_engine.py` to isolate the face, extract a 128-d vector, and hash the biometric structure.
* **OSINT Search:** We hit SerpApi using `src/modules/search.ts` to reverse-search the face across the web and retrieve the canonical URL.
* **Evidence Freezing:** The `src/modules/ipfs.ts` module uses Pinata to pin the raw image permanently to IPFS.
* **Blockchain Commit:** In `src/index.ts`, we cryptographically bind the URL, pHash, and Blinded Biometric vector using Viem, and send it to the `recordAttestation` function in our `VerificationRegistry.sol` smart contract.

![Happy Path Execution](images/working/cmd%201%20working.jpeg)

### 2. The Red-Team Tamper Attack
```bash
npx tsx src/index.ts images/test_image.png --tamper
```
**Under the Hood:**
* The `--tamper` flag intercepts the pipeline right before the final verification step in `src/index.ts`.
* **The Simulation:** We purposefully corrupt the Transport Hash by appending `"_FAKE_DEEPFAKE"` to the discovered URL before verifying:
  ```typescript
  if (isTamperAttack) {
      transportHash = generateTransportHash(url + "_FAKE_DEEPFAKE", discoveredAt);
  }
  ```
* **The Interception:** When we pass this corrupted hash to `verifyIntegrity` in `VerificationRegistry.sol`, the smart contract realizes the cryptographic payload doesn't match the original immutable record. 
* It actively rejects the mismatch and triggers the massive red `INTEGRITY BREACH DETECTED` alert, proving that deepfakes or altered URLs cannot bypass our Dual-Layer Attestation.

![Tamper Attack Execution](images/working/cmd%202%20working.jpeg)

## 🔗 Blockchain Details
- Configured for Anvil (zero-latency local forensic simulation) and 100% compatible with Polygon Amoy.
- **Contract:** Solidity `^0.8.20`.
- **Client:** `viem` for robust EVM interactions.
