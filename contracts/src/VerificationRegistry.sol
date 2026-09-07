// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VerificationRegistry {
    struct ForensicAttestation {
        bytes32 transportHash;
        bytes32 perceptualHash;
        bytes32 biometricCommitment;
        string sourceUrl;
        uint256 discoveredAt;
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
        string calldata _sourceUrl
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
            discoveredAt: block.timestamp
        });

        emit AttestationRecorded(_transportHash, _sourceUrl, block.timestamp);
    }

    function verifyIntegrity(
        bytes32 _transportHash,
        bytes32 _pHash,
        bytes32 _bioCommitment
    ) external view returns (bool, string memory, uint256) {
        ForensicAttestation memory attestation = registry[_transportHash];
        
        if (attestation.discoveredAt == 0) {
            return (false, "", 0);
        }

        bool isValid = (attestation.perceptualHash == _pHash) && 
                       (attestation.biometricCommitment == _bioCommitment);

        return (isValid, attestation.sourceUrl, attestation.discoveredAt);
    }
}
