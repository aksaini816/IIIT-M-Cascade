// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TraceTrust purpose-bound education donation escrow
/// @notice Stores only hashed identifiers and claim commitments; no PII or documents are stored on-chain.
contract TraceTrustEscrow {
    enum PurposeCategory {
        SchoolFees,
        Books,
        Uniforms,
        Stationery,
        EducationSupplies
    }

    struct Allocation {
        bytes32 allocationId;
        address donor;
        bytes32 schoolHash;
        PurposeCategory allowedPurpose;
        uint256 totalFunded;
        uint256 totalReleased;
        bool isFrozen;
        bool exists;
    }

    struct ClaimCommitment {
        bytes32 claimId;
        bytes32 allocationId;
        bytes32 evidenceSha256;
        PurposeCategory expenseCategory;
        uint256 amount;
        address vendor;
        bool isVerifiedIssuer;
        bool released;
    }

    error AllocationAlreadyExists(bytes32 allocationId);
    error AllocationNotFound(bytes32 allocationId);
    error ClaimAlreadyExists(bytes32 claimId);
    error EvidenceCommitmentRequired();
    error DuplicateEvidenceCommitment(bytes32 evidenceSha256);
    error PurposeCategoryMismatch(PurposeCategory expected, PurposeCategory received);
    error InvalidIssuerVerification();
    error AllocationIsFrozen(bytes32 allocationId);
    error UnauthorizedRelease();
    error OverspendingAllocation(uint256 requested, uint256 available);
    error ClaimNotFound(bytes32 claimId);
    error ClaimAlreadyReleased(bytes32 claimId);
    error InvalidVendor();
    error NoValueFunded();

    event AllocationFunded(
        bytes32 indexed allocationId,
        address indexed donor,
        bytes32 indexed schoolHash,
        PurposeCategory allowedPurpose,
        uint256 amount
    );
    event EvidenceCommitted(
        bytes32 indexed claimId,
        bytes32 indexed allocationId,
        bytes32 indexed evidenceSha256,
        PurposeCategory expenseCategory,
        uint256 amount,
        address vendor
    );
    event DuplicateCommitmentRejected(bytes32 indexed evidenceSha256, bytes32 indexed allocationId);
    event AllocationFrozen(bytes32 indexed allocationId, string reason);
    event FundsReleased(bytes32 indexed claimId, bytes32 indexed allocationId, address indexed vendor, uint256 amount);

    address public immutable owner;
    mapping(address => bool) public auditors;
    mapping(bytes32 => Allocation) public allocations;
    mapping(bytes32 => ClaimCommitment) public claims;
    mapping(bytes32 => bool) public usedEvidenceCommitments;

    modifier onlyAuditor() {
        if (!auditors[msg.sender]) revert UnauthorizedRelease();
        _;
    }

    constructor() {
        owner = msg.sender;
        auditors[msg.sender] = true;
    }

    function setAuditor(address account, bool enabled) external {
        if (msg.sender != owner) revert UnauthorizedRelease();
        auditors[account] = enabled;
    }

    function fundAllocation(
        bytes32 allocationId,
        bytes32 schoolHash,
        PurposeCategory allowedPurpose
    ) external payable {
        if (msg.value == 0) revert NoValueFunded();
        if (allocations[allocationId].exists) revert AllocationAlreadyExists(allocationId);

        allocations[allocationId] = Allocation({
            allocationId: allocationId,
            donor: msg.sender,
            schoolHash: schoolHash,
            allowedPurpose: allowedPurpose,
            totalFunded: msg.value,
            totalReleased: 0,
            isFrozen: false,
            exists: true
        });

        emit AllocationFunded(allocationId, msg.sender, schoolHash, allowedPurpose, msg.value);
    }

    function registerEvidenceAndClaim(
        bytes32 claimId,
        bytes32 allocationId,
        bytes32 evidenceSha256,
        PurposeCategory expenseCategory,
        uint256 amount,
        address vendor,
        bool isVerifiedIssuer
    ) external onlyAuditor {
        Allocation storage allocation = allocations[allocationId];
        if (!allocation.exists) revert AllocationNotFound(allocationId);
        if (allocation.isFrozen) revert AllocationIsFrozen(allocationId);
        if (claims[claimId].claimId != bytes32(0)) revert ClaimAlreadyExists(claimId);
        if (evidenceSha256 == bytes32(0)) revert EvidenceCommitmentRequired();
        if (usedEvidenceCommitments[evidenceSha256]) {
            emit DuplicateCommitmentRejected(evidenceSha256, allocationId);
            revert DuplicateEvidenceCommitment(evidenceSha256);
        }
        if (expenseCategory != allocation.allowedPurpose) {
            revert PurposeCategoryMismatch(allocation.allowedPurpose, expenseCategory);
        }
        if (!isVerifiedIssuer) revert InvalidIssuerVerification();
        if (vendor == address(0)) revert InvalidVendor();

        usedEvidenceCommitments[evidenceSha256] = true;
        claims[claimId] = ClaimCommitment({
            claimId: claimId,
            allocationId: allocationId,
            evidenceSha256: evidenceSha256,
            expenseCategory: expenseCategory,
            amount: amount,
            vendor: vendor,
            isVerifiedIssuer: isVerifiedIssuer,
            released: false
        });

        emit EvidenceCommitted(claimId, allocationId, evidenceSha256, expenseCategory, amount, vendor);
    }

    function freezeAllocation(bytes32 allocationId, string calldata reason) external onlyAuditor {
        Allocation storage allocation = allocations[allocationId];
        if (!allocation.exists) revert AllocationNotFound(allocationId);
        allocation.isFrozen = true;
        emit AllocationFrozen(allocationId, reason);
    }

    function releaseFunds(bytes32 claimId) external {
        ClaimCommitment storage claim = claims[claimId];
        if (claim.claimId == bytes32(0)) revert ClaimNotFound(claimId);
        Allocation storage allocation = allocations[claim.allocationId];
        if (allocation.isFrozen) revert AllocationIsFrozen(claim.allocationId);
        if (!auditors[msg.sender] || !claim.isVerifiedIssuer) revert UnauthorizedRelease();
        if (claim.released) revert ClaimAlreadyReleased(claimId);

        uint256 available = allocation.totalFunded - allocation.totalReleased;
        if (claim.amount > available) revert OverspendingAllocation(claim.amount, available);

        claim.released = true;
        allocation.totalReleased += claim.amount;
        (bool success, ) = payable(claim.vendor).call{value: claim.amount}("");
        if (!success) revert UnauthorizedRelease();
        emit FundsReleased(claimId, claim.allocationId, claim.vendor, claim.amount);
    }
}
