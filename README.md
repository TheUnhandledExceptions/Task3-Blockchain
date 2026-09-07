# 🛡️ Dual-Layer Forensic Attestation Pipeline (HH Goa 2026 - Task 3)

An autonomous, privacy-preserving OSINT pipeline that takes a raw face image, identifies the exact source on social media, and notarizes the discovery on an EVM blockchain to create an immutable chain-of-custody.

## 🚀 The USP: Dual-Layer Tamper Resistance
Most reverse-image pipelines fail in the real world because social media platforms aggressively compress and alter images (WebP conversions, EXIF stripping). A simple `SHA-256` of a downloaded image will break instantly upon verification.

This project solves the **"Compression Paradox"** by utilizing a **Dual-Layer Attestation**:
1. **Layer A (Transport Proof):** SHA-256 of the raw discovered URL and timestamp.
2. **Layer B (Invariant Proof):** A 64-bit Perceptual Hash (pHash) combined with a 128-dimensional biometric vector commitment. 
Even if the image is heavily compressed by Instagram/Facebook, the biometric and perceptual hashes remain stable, proving the identity inextricably belongs to the URL.

## 🏗️ Architecture

1. **The Python Chef (Computer Vision):** Uses OpenCV's DNN (YuNet) to detect faces, extract a 128-d biometric feature vector, and calculate a perceptual hash (pHash). It also intelligently resizes the full image to bypass API constraints.
2. **The TypeScript Orchestrator:** Hits the **SerpApi (Google Lens)** engine with the context-rich resized image to discover the real, canonical social media post (e.g., Instagram, Facebook, X).
3. **The EVM Vault:** Packs the evidence into a cryptographic EIP-712 style struct and commits it to a smart contract registry.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Foundry (Forge, Anvil, Cast)

### Setup Steps
1. **Clone & Install Dependencies:**
   ```bash
   npm install
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   SERPAPI_API_KEY=your_serpapi_key
   AMOY_RPC_URL=http://127.0.0.1:8545
   PRIVATE_KEY=your_testnet_or_anvil_private_key
   REGISTRY_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

3. **Deploy the Smart Contract:**
   Start your local blockchain:
   ```bash
   anvil
   ```
   In a new terminal, deploy the vault:
   ```bash
   forge script contracts/script/DeployRegistry.s.sol:DeployRegistry --rpc-url http://127.0.0.1:8545 --broadcast
   ```

## 💻 Usage & Live Tamper Demo

1. **Standard Evidence Processing (The Happy Path):**
   ```bash
   npx tsx src/index.ts images/test_image.png
   ```
   Detects the face, finds the social post, generates the dual-layer hash, and verifies it on-chain.

2. **The Red-Team Tamper Attack:**
   ```bash
   npx tsx src/index.ts images/test_image.png --tamper
   ```
   Simulates a bad actor attempting to verify a corrupted/deepfaked URL against the blockchain record. The smart contract actively intercepts the mismatch and triggers an INTEGRITY BREACH DETECTED alert.

## 🔗 Blockchain Details
This project is configured to run on Anvil (for zero-latency local forensic simulation) and is 100% compatible with the Polygon Amoy Testnet.
- **Smart Contract:** Written in Solidity `^0.8.20`.
- **Client Library:** `viem` for robust, type-safe EVM interactions.

## ⚠️ Known Limitations
- **API Rate Limits:** SerpApi free tier restricts throughput to 100 searches per month.
- **Extreme Angles:** OpenCV's YuNet struggles with extreme profile faces (greater than 75-degree yaw).
- **Video Processing:** Currently only supports static image frames.

## ⚖️ Ethical & Privacy Considerations
Searching the live web for faces introduces massive privacy concerns. To adhere to GDPR and prevent public biometric surveillance:
- **Zero-Knowledge Commitments:** The raw 128-dimensional facial embeddings are never stored on the blockchain in plaintext. They are mathematically blinded (hashed) before being sent to the EVM.
- The public ledger only sees cryptographic noise, ensuring the system verifies identity without ever leaking reversible Personally Identifiable Information (PII) to the public domain.

