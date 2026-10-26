// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Kindora privacy-preserving commitment ledger
/// @notice Stores only hashes, integer paise amounts, and enum-like state flags.
contract KindoraCommitmentLedger {
    error Unauthorized();
    error DuplicateEvidenceCommitment(bytes32 evidenceSha256);
    error DistinctApproversRequired();
    error AllocationFrozenError();
    error MissingDualApprovalCommitment();
    error DuplicateReleaseCommitment();
    error InvalidInput();

    struct Allocation {
        bytes32 campaignIdHash;
        bytes32 purposeHash;
        uint256 budgetPaise;
        bool isFrozen;
        bool exists;
    }

    struct Approval {
        bytes32 approverCommitmentHash;
        bool recorded;
    }

    address public immutable admin;
    mapping(address => bool) public auditors;
    mapping(bytes32 => Allocation) public allocations;
    mapping(bytes32 => bool) public usedEvidenceCommitments;
    mapping(bytes32 => bool) public expenseExists;
    mapping(bytes32 => Approval[2]) private approvals;
    mapping(bytes32 => bool) public releasedPayouts;
    mapping(bytes32 => bool) public releasedExpenses;
    bool private entered;

    event AllocationCommitted(bytes32 indexed allocationIdHash, bytes32 indexed campaignIdHash, bytes32 purposeHash, uint256 budgetPaise);
    event ExpenseCommitted(bytes32 indexed expenseIdHash, bytes32 indexed allocationIdHash, uint32 version, uint256 amountPaise, bytes32 evidenceSha256);
    event ApprovalCommitted(bytes32 indexed expenseIdHash, uint32 version, uint8 indexed slot, bytes32 approverCommitmentHash);
    event AllocationFreezeChanged(bytes32 indexed allocationIdHash, bool isFrozen, bytes32 reasonHash);
    event PayoutReleaseCommitted(bytes32 indexed payoutIdHash, bytes32 indexed expenseIdHash, uint32 version, uint256 amountPaise);
    event AuditRootAnchored(uint256 indexed upToSequence, bytes32 indexed auditChainRootHash);

    modifier onlyAuthorized() {
        if (msg.sender != admin && !auditors[msg.sender]) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (entered) revert Unauthorized();
        entered = true;
        _;
        entered = false;
    }

    constructor() {
        admin = msg.sender;
        auditors[msg.sender] = true;
    }

    function setAuditor(address account, bool enabled) external nonReentrant {
        if (msg.sender != admin) revert Unauthorized();
        auditors[account] = enabled;
    }

    function recordAllocationCommitment(bytes32 allocationIdHash, bytes32 campaignIdHash, bytes32 purposeHash, uint256 budgetPaise) external onlyAuthorized nonReentrant {
        if (allocationIdHash == bytes32(0) || budgetPaise == 0 || allocations[allocationIdHash].exists) revert InvalidInput();
        allocations[allocationIdHash] = Allocation(campaignIdHash, purposeHash, budgetPaise, false, true);
        emit AllocationCommitted(allocationIdHash, campaignIdHash, purposeHash, budgetPaise);
    }

    function recordExpenseCommitment(bytes32 expenseIdHash, bytes32 allocationIdHash, uint32 version, uint256 amountPaise, bytes32 evidenceSha256) external onlyAuthorized nonReentrant {
        if (!allocations[allocationIdHash].exists || expenseExists[expenseIdHash] || evidenceSha256 == bytes32(0)) revert InvalidInput();
        if (usedEvidenceCommitments[evidenceSha256]) revert DuplicateEvidenceCommitment(evidenceSha256);
        usedEvidenceCommitments[evidenceSha256] = true;
        expenseExists[expenseIdHash] = true;
        expenseAllocations[expenseIdHash] = allocationIdHash;
        emit ExpenseCommitted(expenseIdHash, allocationIdHash, version, amountPaise, evidenceSha256);
    }

    function recordApprovalCommitment(bytes32 expenseIdHash, uint32 version, uint8 slot, bytes32 approverCommitmentHash) external onlyAuthorized nonReentrant {
        if (!expenseExists[expenseIdHash] || slot > 1 || approverCommitmentHash == bytes32(0)) revert InvalidInput();
        Approval[2] storage expenseApprovals = approvals[_approvalKey(expenseIdHash, version)];
        if (expenseApprovals[slot].recorded) revert InvalidInput();
        uint8 otherSlot = slot == 0 ? 1 : 0;
        if (expenseApprovals[otherSlot].recorded && expenseApprovals[otherSlot].approverCommitmentHash == approverCommitmentHash) revert DistinctApproversRequired();
        expenseApprovals[slot] = Approval(approverCommitmentHash, true);
        emit ApprovalCommitted(expenseIdHash, version, slot, approverCommitmentHash);
    }

    function setAllocationFreezeStatus(bytes32 allocationIdHash, bool isFrozen, bytes32 reasonHash) external onlyAuthorized nonReentrant {
        if (!allocations[allocationIdHash].exists) revert InvalidInput();
        allocations[allocationIdHash].isFrozen = isFrozen;
        emit AllocationFreezeChanged(allocationIdHash, isFrozen, reasonHash);
    }

    function recordPayoutReleaseCommitment(bytes32 payoutIdHash, bytes32 expenseIdHash, uint32 version, uint256 amountPaise) external onlyAuthorized nonReentrant {
        if (releasedPayouts[payoutIdHash] || releasedExpenses[_releaseKey(expenseIdHash, version)]) revert DuplicateReleaseCommitment();
        if (!expenseExists[expenseIdHash]) revert InvalidInput();
        Allocation memory allocation = _allocationForExpense(expenseIdHash);
        if (allocation.isFrozen) revert AllocationFrozenError();
        Approval[2] memory expenseApprovals = approvals[_approvalKey(expenseIdHash, version)];
        if (!expenseApprovals[0].recorded || !expenseApprovals[1].recorded) revert MissingDualApprovalCommitment();
        releasedPayouts[payoutIdHash] = true;
        releasedExpenses[_releaseKey(expenseIdHash, version)] = true;
        emit PayoutReleaseCommitted(payoutIdHash, expenseIdHash, version, amountPaise);
    }

    function anchorAuditRoot(uint256 upToSequence, bytes32 auditChainRootHash) external onlyAuthorized nonReentrant {
        if (auditChainRootHash == bytes32(0)) revert InvalidInput();
        emit AuditRootAnchored(upToSequence, auditChainRootHash);
    }

    function getApprovalCommitments(bytes32 expenseIdHash, uint32 version) external view returns (Approval[2] memory) {
        return approvals[_approvalKey(expenseIdHash, version)];
    }

    mapping(bytes32 => bytes32) private expenseAllocations;
    function _allocationForExpense(bytes32 expenseIdHash) private view returns (Allocation memory) {
        return allocations[expenseAllocations[expenseIdHash]];
    }
    function _approvalKey(bytes32 expenseIdHash, uint32 version) private pure returns (bytes32) {
        return keccak256(abi.encode(expenseIdHash, version));
    }
    function _releaseKey(bytes32 expenseIdHash, uint32 version) private pure returns (bytes32) {
        return keccak256(abi.encode(expenseIdHash, version));
    }
}
