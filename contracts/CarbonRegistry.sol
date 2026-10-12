// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CarbonRegistry {
    address public owner;

    struct Batch {
        string projectId;
        uint256 start;       // First serial number (e.g., 1000)
        uint256 end;         // Last serial number (e.g., 2000)
        bytes32 evidenceHash;
        address issuer;
        address auditor;     // NEW: address(0) until an auditor attests
    }

    Batch[] public batches;
    mapping(uint256 => mapping(uint256 => bool)) public retired; // batchId => serial => isRetired
    mapping(address => bool) public auditors;                    // NEW

    event BatchRegistered(uint256 indexed batchId, string projectId, uint256 start, uint256 end);
    event CreditRetired(uint256 indexed batchId, uint256 serial, address by);
    event AuditorAdded(address indexed auditor);                 // NEW
    event BatchAttested(uint256 indexed batchId, address indexed auditor); // NEW

    constructor() {
        owner = msg.sender;
    }

    // NEW: only the owner can approve auditors
    function addAuditor(address a) external {
        require(msg.sender == owner, "Only owner");
        auditors[a] = true;
        emit AuditorAdded(a);
    }

    // Enforces the "No Overlap" rule
    function registerBatch(string calldata projectId, uint256 start, uint256 end, bytes32 evidenceHash)
        external returns (uint256 id)
    {
        require(start <= end, "Bad range: start must be <= end");

        bytes32 pid = keccak256(bytes(projectId));

        // Loop through existing batches to detect overlapping serials for the same project
        for (uint256 i = 0; i < batches.length; i++) {
            Batch storage b = batches[i];
            if (keccak256(bytes(b.projectId)) == pid && start <= b.end && end >= b.start) {
                revert("Overlaps existing batch: double counting blocked!");
            }
        }

        batches.push(Batch(projectId, start, end, evidenceHash, msg.sender, address(0)));
        id = batches.length - 1;

        emit BatchRegistered(id, projectId, start, end);
    }

    // NEW: an approved auditor vouches for a batch (once)
    function attest(uint256 batchId) external {
        require(auditors[msg.sender], "Not an auditor");
        Batch storage b = batches[batchId];
        require(b.auditor == address(0), "Already attested");
        b.auditor = msg.sender;
        emit BatchAttested(batchId, msg.sender);
    }

    function retire(uint256 batchId, uint256 serial) external {
        Batch storage b = batches[batchId];
        require(serial >= b.start && serial <= b.end, "Serial not in batch range");
        require(!retired[batchId][serial], "Credit already retired!");

        retired[batchId][serial] = true;
        emit CreditRetired(batchId, serial, msg.sender);
    }

    function isRetired(uint256 batchId, uint256 serial) external view returns (bool) {
        return retired[batchId][serial];
    }
}