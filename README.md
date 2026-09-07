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
   pip install -r requirements.txt# Task3-Blockchain
