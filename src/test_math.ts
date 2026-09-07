import { createPublicClient, http, parseAbi } from 'viem';
import 'dotenv/config';

async function main() {
    if (!process.env.REGISTRY_CONTRACT_ADDRESS) {
        throw new Error("Missing REGISTRY_CONTRACT_ADDRESS in .env");
    }

    const publicClient = createPublicClient({
        transport: http('http://127.0.0.1:8545')
    });

    const abi = parseAbi([
        'function verifyBiometricMatch(int16[128], int16[128]) view returns (bool, int256)'
    ]);
    const contractAddress = process.env.REGISTRY_CONTRACT_ADDRESS as `0x${string}`;

    // Create Mock Vectors
    const validVector = Array(128).fill(883);
    const deepfakeVector = validVector.map((val, i) => i % 2 === 0 ? -val : val);

    console.log("🧪 Running EVM-Native Cosine Math Tests...\n");

    // Execute Test 1 (Authentic Match)
    const result1 = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'verifyBiometricMatch',
        args: [validVector, validVector]
    }) as [boolean, bigint];

    const match1 = result1[0];
    const score1 = (Number(result1[1]) / 1000000).toFixed(2);
    console.log(`✅ TEST 1 (Authentic Face): Match = ${match1}, Score = ${score1}%`);

    // Execute Test 2 (Deepfake Tamper)
    const result2 = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'verifyBiometricMatch',
        args: [validVector, deepfakeVector]
    }) as [boolean, bigint];

    const match2 = result2[0];
    const score2 = (Number(result2[1]) / 1000000).toFixed(2);
    console.log(`❌ TEST 2 (Deepfake Attack): Match = ${match2}, Score = ${score2}%`);

    // Create Mild Tamper Vector (flips only 10% of the features)
    const mildTamperVector = validVector.map((val, i) => i % 10 === 0 ? -val : val);

    // Execute Test 3 (Mild Tamper)
    const result3 = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'verifyBiometricMatch',
        args: [validVector, mildTamperVector]
    }) as [boolean, bigint];

    const match3 = result3[0];
    const score3 = (Number(result3[1]) / 1000000).toFixed(2);
    console.log(`⚠️  TEST 3 (Mild Tamper - 10% Feature Swap): Match = ${match3}, Score = ${score3}%`);
}

main().catch(console.error);
