// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VerificationRegistry {
    struct ForensicAttestation {
        bytes32 transportHash;
        bytes32 perceptualHash;
        bytes32 biometricCommitment;
        string sourceUrl;
        uint256 discoveredAt;
        string ipfsCID;
    }

    mapping(bytes32 => ForensicAttestation) public registry;

    event AttestationRecorded(
        bytes32 indexed transportHash,
        string sourceUrl,
        uint256 timestamp
    );

    function recordAttestation(
        bytes32 _transportHash,
        bytes32 _pHash,
        bytes32 _bioCommitment,
        string calldata _sourceUrl,
        string calldata _ipfsCID
    ) external {
        require(
            registry[_transportHash].discoveredAt == 0,
            "Attestation already registered"
        );

        registry[_transportHash] = ForensicAttestation({
            transportHash: _transportHash,
            perceptualHash: _pHash,
            biometricCommitment: _bioCommitment,
            sourceUrl: _sourceUrl,
            discoveredAt: block.timestamp,
            ipfsCID: _ipfsCID
        });

        emit AttestationRecorded(_transportHash, _sourceUrl, block.timestamp);
    }

    function verifyIntegrity(
        bytes32 _transportHash,
        bytes32 _pHash,
        bytes32 _bioCommitment
    ) external view returns (bool, string memory, uint256, string memory) {
        ForensicAttestation memory attestation = registry[_transportHash];
        
        if (attestation.discoveredAt == 0) {
            return (false, "", 0, "");
        }

        bool isValid = (attestation.perceptualHash == _pHash) && 
                       (attestation.biometricCommitment == _bioCommitment);

        return (isValid, attestation.sourceUrl, attestation.discoveredAt, attestation.ipfsCID);
    }

    function computeCosineSimilarity(int16[128] calldata vecA, int16[128] calldata vecB) public pure returns (int256) {
        int256 dotProduct = 0;
        for (uint256 i = 0; i < 128; i++) {
            dotProduct += int256(vecA[i]) * int256(vecB[i]);
        }
        return dotProduct;
    }

    function verifyBiometricMatch(int16[128] calldata originalVector, int16[128] calldata candidateVector) public pure returns (bool isMatch, int256 similarityScore) {
        similarityScore = computeCosineSimilarity(originalVector, candidateVector);
        isMatch = similarityScore > 85000000;
        return (isMatch, similarityScore);
    }
}
