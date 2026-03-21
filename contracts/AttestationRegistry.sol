// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title AttestationRegistry
/// @notice Stores attestation hashes on-chain as immutable proof that API credentials
///         were destroyed inside a TEE enclave. Only the hash is stored to minimize gas.
///         Full attestation data lives off-chain; the hash proves it existed at a point in time.
contract AttestationRegistry {
    mapping(bytes32 => uint256) public attestations;

    event Stored(bytes32 indexed hash, address indexed submitter, uint256 timestamp);

    function store(bytes32 hash) external {
        require(attestations[hash] == 0, "Attestation already exists");
        attestations[hash] = block.timestamp;
        emit Stored(hash, msg.sender, block.timestamp);
    }

    function verify(bytes32 hash) external view returns (bool exists, uint256 timestamp) {
        uint256 ts = attestations[hash];
        return (ts > 0, ts);
    }
}
