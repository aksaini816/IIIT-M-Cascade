// @ts-nocheck
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TraceTrustEscrow", function () {
  async function deploy() {
    const [owner, donor, vendor, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("TraceTrustEscrow");
    const escrow = await factory.deploy();
    await escrow.waitForDeployment();
    return { escrow, owner, donor, vendor, stranger };
  }

  function id(label: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
  }

  async function fund(escrow: any, donor: any, label: string, amount: bigint) {
    const allocationId = id(`allocation-${label}`);
    await escrow.connect(donor).fundAllocation(allocationId, id(`school-${label}`), 1, { value: amount });
    return allocationId;
  }

  it("funds a purpose-bound allocation and releases a valid verified claim", async function () {
    const { escrow, donor, vendor } = await deploy();
    const allocationId = await fund(escrow, donor, "valid", ethers.parseEther("1"));
    const claimId = id("claim-valid");
    const evidence = id("evidence-valid");

    await escrow.registerEvidenceAndClaim(claimId, allocationId, evidence, 1, ethers.parseEther("0.4"), vendor.address, true);
    const before = await ethers.provider.getBalance(vendor.address);
    await expect(escrow.releaseFunds(claimId)).to.emit(escrow, "FundsReleased");
    const after = await ethers.provider.getBalance(vendor.address);
    expect(after - before).to.equal(ethers.parseEther("0.4"));
    expect((await escrow.claims(claimId)).released).to.equal(true);
  });

  it("rejects reuse of an evidence commitment across allocations", async function () {
    const { escrow, donor, vendor } = await deploy();
    const first = await fund(escrow, donor, "first", ethers.parseEther("1"));
    const second = await fund(escrow, donor, "second", ethers.parseEther("1"));
    const evidence = id("evidence-duplicate");
    await escrow.registerEvidenceAndClaim(id("claim-first"), first, evidence, 1, 1, vendor.address, true);
    await expect(escrow.registerEvidenceAndClaim(id("claim-second"), second, evidence, 1, 1, vendor.address, true))
      .to.be.revertedWithCustomError(escrow, "DuplicateEvidenceCommitment")
      .withArgs(evidence);
  });

  it("rejects unauthorized release and purpose mismatches", async function () {
    const { escrow, donor, vendor, stranger } = await deploy();
    const allocationId = await fund(escrow, donor, "authorization", ethers.parseEther("1"));
    const claimId = id("claim-authorization");
    await expect(escrow.registerEvidenceAndClaim(claimId, allocationId, id("evidence-auth"), 2, 1, vendor.address, true))
      .to.be.revertedWithCustomError(escrow, "PurposeCategoryMismatch");
    await escrow.registerEvidenceAndClaim(claimId, allocationId, id("evidence-auth"), 1, 1, vendor.address, true);
    await expect(escrow.connect(stranger).releaseFunds(claimId))
      .to.be.revertedWithCustomError(escrow, "UnauthorizedRelease");
  });

  it("rejects an overspending claim at release", async function () {
    const { escrow, donor, vendor } = await deploy();
    const allocationId = await fund(escrow, donor, "overspend", ethers.parseEther("1"));
    const claimId = id("claim-overspend");
    await escrow.registerEvidenceAndClaim(claimId, allocationId, id("evidence-overspend"), 1, ethers.parseEther("2"), vendor.address, true);
    await expect(escrow.releaseFunds(claimId))
      .to.be.revertedWithCustomError(escrow, "OverspendingAllocation")
      .withArgs(ethers.parseEther("2"), ethers.parseEther("1"));
  });

  it("blocks release after an allocation is frozen", async function () {
    const { escrow, donor, vendor } = await deploy();
    const allocationId = await fund(escrow, donor, "frozen", ethers.parseEther("1"));
    const claimId = id("claim-frozen");
    await escrow.registerEvidenceAndClaim(claimId, allocationId, id("evidence-frozen"), 1, 1, vendor.address, true);
    await escrow.freezeAllocation(allocationId, "Duplicate evidence fraud alert");
    await expect(escrow.releaseFunds(claimId))
      .to.be.revertedWithCustomError(escrow, "AllocationIsFrozen")
      .withArgs(allocationId);
  });
});
