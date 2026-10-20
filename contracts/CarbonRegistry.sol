// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CarbonRegistry {
    address public owner;

    struct Batch {
        string projectId;
        uint256 start;
        uint256 end;
        bytes32 evidenceHash;
        address issuer;
        address auditor;
    }

    struct Range {
        uint256 start;
        uint256 end;
    }

    struct Listing {
        uint256 batchId;
        address seller;
        uint256 start;
        uint256 end;
        uint256 pricePerCredit; // in wei
        bool active;
    }

    Batch[] public batches;
    Listing[] public listings;
    mapping(uint256 => mapping(uint256 => bool)) public retired;
    mapping(address => bool) public auditors;
    mapping(uint256 => mapping(address => Range[])) private holdings; // batchId => owner => ranges
    mapping(address => uint256[]) private heldBatchIds;
    mapping(address => mapping(uint256 => uint256)) private heldBatchIndexPlusOne;

    event BatchRegistered(uint256 indexed batchId, string projectId, uint256 start, uint256 end);
    event CreditRetired(uint256 indexed batchId, uint256 serial, address by);
    event AuditorAdded(address indexed auditor);
    event BatchAttested(uint256 indexed batchId, address indexed auditor);
    event ListingCreated(uint256 indexed listingId, uint256 indexed batchId, address indexed seller, uint256 start, uint256 end, uint256 pricePerCredit);
    event ListingCancelled(uint256 indexed listingId);
    event CreditsTransferred(
        uint256 indexed listingId,
        uint256 indexed batchId,
        address indexed seller,
        address buyer,
        uint256 start,
        uint256 end,
        uint256 totalPrice,
        uint256 blockNumber,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function addAuditor(address a) external {
        require(msg.sender == owner, "Only owner");
        auditors[a] = true;
        emit AuditorAdded(a);
    }

    function registerBatch(string calldata projectId, uint256 start, uint256 end, bytes32 evidenceHash)
        external returns (uint256 id)
    {
        require(start <= end, "Bad range: start must be <= end");

        bytes32 pid = keccak256(bytes(projectId));
        for (uint256 i = 0; i < batches.length; i++) {
            Batch storage b = batches[i];
            if (keccak256(bytes(b.projectId)) == pid && start <= b.end && end >= b.start) {
                revert("Overlaps existing batch: double counting blocked!");
            }
        }

        batches.push(Batch(projectId, start, end, evidenceHash, msg.sender, address(0)));
        id = batches.length - 1;

        // the issuer starts out holding the whole batch
        _addRange(id, msg.sender, start, end);

        emit BatchRegistered(id, projectId, start, end);
    }

    function attest(uint256 batchId) external {
        require(auditors[msg.sender], "Not an auditor");
        Batch storage b = batches[batchId];
        require(b.auditor == address(0), "Already attested");
        b.auditor = msg.sender;
        emit BatchAttested(batchId, msg.sender);
    }

    // ---------- Selling and buying ----------

    // The seller picks a holding and a quantity. The START serial is fixed to
    // the front of that holding, so the seller can never pick a range from the middle.
    function createListing(uint256 batchId, uint256 holdingIndex, uint256 quantity, uint256 pricePerCredit)
        external returns (uint256 listingId)
    {
        Range[] storage hs = holdings[batchId][msg.sender];
        require(holdingIndex < hs.length, "No such holding");
        Range storage h = hs[holdingIndex];
        require(quantity > 0 && quantity <= h.end - h.start + 1, "Bad quantity");

        uint256 s = h.start;
        uint256 e = s + quantity - 1;
        listings.push(Listing(batchId, msg.sender, s, e, pricePerCredit, true));
        listingId = listings.length - 1;

        emit ListingCreated(listingId, batchId, msg.sender, s, e, pricePerCredit);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender, "Not your listing");
        require(l.active, "Listing not active");
        l.active = false;
        emit ListingCancelled(listingId);
    }

    // One transaction: payment, seller debit and buyer credit all happen together.
    // If ANY step fails, the whole transaction reverts and nothing changes.
    function buy(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Listing not active");
        require(msg.sender != l.seller, "Cannot buy your own listing");

        uint256 total = (l.end - l.start + 1) * l.pricePerCredit;
        require(msg.value == total, "Wrong payment amount");
        require(
            !_hasOverlappingHolding(msg.sender, l.start, l.end),
            "Buyer already holds overlapping serials"
        );

        // the seller must still hold this exact range at the front
        Range[] storage hs = holdings[l.batchId][l.seller];
        (bool found, uint256 idx) = _findByStart(hs, l.start);
        require(found && hs[idx].end >= l.end, "Listing no longer valid");

        // effects first (state changes before sending money)
        l.active = false;
        _removeFromFront(l.batchId, l.seller, idx, l.end);
        _addRange(l.batchId, msg.sender, l.start, l.end);

        // payment to the seller; failure reverts everything above
        (bool ok, ) = payable(l.seller).call{value: total}("");
        require(ok, "Payment to seller failed");

        _emitTransfer(listingId, l, total);
    }

    function _emitTransfer(uint256 listingId, Listing storage l, uint256 total) internal {
        emit CreditsTransferred(
            listingId, l.batchId, l.seller, msg.sender,
            l.start, l.end, total, block.number, block.timestamp
        );
    }

    // ---------- Helpers ----------

    function _findByStart(Range[] storage hs, uint256 start) internal view returns (bool, uint256) {
        for (uint256 i = 0; i < hs.length; i++) {
            if (hs[i].start == start) return (true, i);
        }
        return (false, 0);
    }

    function _hasOverlappingHolding(address who, uint256 start, uint256 end) internal view returns (bool) {
        uint256[] storage batchIds = heldBatchIds[who];
        for (uint256 i = 0; i < batchIds.length; i++) {
            Range[] storage hs = holdings[batchIds[i]][who];
            for (uint256 j = 0; j < hs.length; j++) {
                if (start <= hs[j].end && end >= hs[j].start) return true;
            }
        }
        return false;
    }

    // Removes serials start..soldEnd from the front of holding idx.
    function _removeFromFront(uint256 batchId, address holder, uint256 idx, uint256 soldEnd) internal {
        Range[] storage hs = holdings[batchId][holder];
        if (hs[idx].end == soldEnd) {
            hs[idx] = hs[hs.length - 1];
            hs.pop();
        } else {
            hs[idx].start = soldEnd + 1;
        }
        if (hs.length == 0) _untrackBatch(holder, batchId);
    }

    // Adds a range to someone's holdings, merging with an adjacent one if possible.
    function _addRange(uint256 batchId, address to, uint256 start, uint256 end) internal {
        Range[] storage hs = holdings[batchId][to];
        if (hs.length == 0) _trackBatch(to, batchId);
        for (uint256 i = 0; i < hs.length; i++) {
            if (hs[i].end + 1 == start) { hs[i].end = end; return; }
            if (end + 1 == hs[i].start) { hs[i].start = start; return; }
        }
        hs.push(Range(start, end));
    }

    function _trackBatch(address holder, uint256 batchId) internal {
        if (heldBatchIndexPlusOne[holder][batchId] != 0) return;
        heldBatchIds[holder].push(batchId);
        heldBatchIndexPlusOne[holder][batchId] = heldBatchIds[holder].length;
    }

    function _untrackBatch(address holder, uint256 batchId) internal {
        uint256 index = heldBatchIndexPlusOne[holder][batchId] - 1;
        uint256[] storage batchIds = heldBatchIds[holder];
        uint256 lastIndex = batchIds.length - 1;
        if (index != lastIndex) {
            uint256 lastBatchId = batchIds[lastIndex];
            batchIds[index] = lastBatchId;
            heldBatchIndexPlusOne[holder][lastBatchId] = index + 1;
        }
        batchIds.pop();
        delete heldBatchIndexPlusOne[holder][batchId];
    }

    // ---------- Views ----------

    function getHoldings(uint256 batchId, address who) external view returns (Range[] memory) {
        return holdings[batchId][who];
    }

    function listingCount() external view returns (uint256) {
        return listings.length;
    }

    function batchCount() external view returns (uint256) {
        return batches.length;
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