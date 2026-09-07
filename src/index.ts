import { execSync } from 'child_process';
import 'dotenv/config';
import { createWalletClient, createPublicClient, http, keccak256, toHex, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy, localhost } from 'viem/chains';
import { performReverseSearch } from './modules/search.js';
import { generateTransportHash, formatBytes32 } from './modules/hasher.js';
import { pinToIPFS } from './modules/ipfs.js';

async function main() {
    console.log(`\n🚀 Starting Dual-Layer Attestation Orchestrator\n`);

    // 1. Robust Argument Parsing
    const isTamperAttack = process.argv.includes('--tamper');
    const imagePath = process.argv.slice(2).find(arg => !arg.startsWith('--'));

    if (!imagePath) {
        console.error("❌ Error: Please provide an image path.");
        console.error("Usage: tsx src/index.ts <path_to_image> [--tamper]");
        process.exit(1);
    }

    // 2. Run the Python Chef
    console.log(`[1/5] 📸 Extracting Face Features & pHash...`);
    let pythonOutputStr: string;
    try {
        // Execute Python script and capture stdout
        const output = execSync(`python src/python/face_engine.py --image ${imagePath}`, { stdio: ['pipe', 'pipe', 'inherit'] });
        pythonOutputStr = output.toString().trim();
    } catch (e: any) {
        console.error("❌ Python Engine failed to execute.");
        process.exit(1);
    }

    let cvData: any;
    try {
        cvData = JSON.parse(pythonOutputStr);
    } catch (e) {
        console.error("❌ Failed to parse Python output as JSON.");
        console.error(pythonOutputStr);
        process.exit(1);
    }

    if (cvData.status !== "success") {
        console.error("❌ Python Engine error:", cvData.message);
        process.exit(1);
    }

    const { crop_path, resized_path, phash, embedding_quantized } = cvData;
    console.log(`      ✅ Found ${cvData.faces_detected} face(s). Cropped to ${crop_path}`);
    console.log(`      ✅ pHash: ${phash}`);

    // 3. Run the Search Module (Using the resized full image to avoid API limits while maintaining context)
    console.log(`\n[2/5] 🔍 Searching Web for Social Identity...`);
    let url: string;
    let title: string;
    try {
        const searchResult = await performReverseSearch(resized_path);
        url = searchResult.url;
        title = searchResult.title;
        console.log(`      ✅ Match Found: ${title}`);
        console.log(`      ✅ URL: ${url}`);
    } catch (e: any) {
        console.error("❌ Search failed:", e.message);
        process.exit(1);
    }

    console.log(`\n[3/6] 🧊 Freezing Evidence to IPFS...`);
    const ipfsCID = await pinToIPFS(imagePath);
    console.log(`      ✅ IPFS CID: ${ipfsCID}`);

    // 4. Generate the Dual-Layer Attestation Fingerprints
    console.log(`\n[4/6] 🔐 Generating Cryptographic Commitments...`);
    const discoveredAt = Math.floor(Date.now() / 1000);
    
    let transportHash = generateTransportHash(url, discoveredAt);
    const pHash32 = formatBytes32(phash);
    
    // Convert array to string, encode to Hex, then keccak256
    const bioString = JSON.stringify(embedding_quantized);
    const bioCommitment = keccak256(toHex(bioString));

    console.log(`      ✅ Layer A (Transport Hash): ${transportHash}`);
    console.log(`      ✅ Layer B (Visual pHash):   ${pHash32}`);
    console.log(`      ✅ Layer B (Bio Commitment): ${bioCommitment}`);

    // 5. Blockchain Transaction (Viem)
    console.log(`\n[5/6] ⛓️  Recording Attestation on Blockchain...`);
    
    if (!process.env.PRIVATE_KEY || !process.env.REGISTRY_CONTRACT_ADDRESS) {
        console.error("❌ Missing PRIVATE_KEY or REGISTRY_CONTRACT_ADDRESS in .env");
        process.exit(1);
    }

    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    // Ensure the private key is properly formatted with a 0x prefix
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
    const rpcUrl = process.env.AMOY_RPC_URL || "";
    
    const isLocal = rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost") || !rpcUrl;
    const chain = isLocal ? localhost : polygonAmoy;
    const transport = isLocal ? http("http://127.0.0.1:8545") : http(rpcUrl);

    const walletClient = createWalletClient({
        account,
        chain,
        transport
    });

    const publicClient = createPublicClient({
        chain,
        transport
    });

    const abi = parseAbi([
        'function recordAttestation(bytes32, bytes32, bytes32, string, string)',
        'function verifyIntegrity(bytes32, bytes32, bytes32) view returns (bool, string, uint256, string)'
    ]);

    const contractAddress = process.env.REGISTRY_CONTRACT_ADDRESS as `0x${string}`;

    let txHash: `0x${string}` = "0x0";
    try {
        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi,
            functionName: 'recordAttestation',
            args: [transportHash, pHash32, bioCommitment, url, ipfsCID]
        });
        txHash = await walletClient.writeContract(request);
        console.log(`      ⏳ Transaction sent. Waiting for receipt... (Tx: ${txHash})`);
        
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(`      ✅ Transaction confirmed!`);
    } catch (e: any) {
        console.error("❌ Blockchain transaction failed:", e.shortMessage || e.message);
        process.exit(1);
    }

    // 6. On-Chain Verification
    console.log(`\n[6/6] 🛡️  Verifying Attestation Integrity...`);
    
    if (isTamperAttack) {
        console.log(`\n⚠️  [!] TAMPER ATTACK INITIATED: Corrupting evidence payload...`);
        transportHash = generateTransportHash(url + "_FAKE_DEEPFAKE", discoveredAt);
    }
    
    try {
        const result = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: 'verifyIntegrity',
            args: [transportHash, pHash32, bioCommitment]
        }) as [boolean, string, bigint, string];

        const [isValid, sourceUrl, timestamp, returnedIpfsCID] = result;

        if (isValid) {
            console.log(`\n🎉===================================================🎉`);
            console.log(`  🌟 MASSIVE SUCCESS: Dual-Layer Attestation Validated! 🌟`);
            console.log(`🎉===================================================🎉\n`);
            console.log(`   Source URL: ${sourceUrl}`);
            console.log(`   Timestamp:  ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
            console.log(`   IPFS Archive: ${returnedIpfsCID}`);
            
            if (isLocal) {
                const blockNum = await publicClient.getBlockNumber();
                console.log(`   Local Anvil Node (Block ${blockNum})`);
            } else {
                console.log(`   Block Explorer: https://amoy.polygonscan.com/tx/${txHash}`);
            }
        } else {
            console.error(`\n🚨===================================================🚨`);
            console.error(`  ❌ [!] INTEGRITY BREACH DETECTED`);
            console.error(`🚨===================================================🚨\n`);
            console.error(`   The evidence payload has been tampered with or does not exist on-chain!`);
        }
    } catch (e: any) {
        console.error(`\n🚨===================================================🚨`);
        console.error(`  ❌ [!] INTEGRITY BREACH DETECTED`);
        console.error(`🚨===================================================🚨\n`);
        console.error(`   Error details: ${e.shortMessage || e.message}`);
    }
}

main().catch(console.error);
