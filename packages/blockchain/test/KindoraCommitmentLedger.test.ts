// @ts-nocheck
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KindoraCommitmentLedger", function () {
  async function deploy() {
    const [admin, auditor, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("KindoraCommitmentLedger");
    const ledger = await factory.deploy();
    await ledger.waitForDeployment();
    await ledger.setAuditor(auditor.address, true);
    return { ledger, admin, auditor, stranger };
  }
  const id = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

  async function setup(ledger: any, signer: any, label = "case") {
    const allocation = id(`allocation-${label}`);
    const expense = id(`expense-${label}`);
    await ledger.connect(signer).recordAllocationCommitment(allocation, id(`campaign-${label}`), id("books"), 1000000);
    await ledger.connect(signer).recordExpenseCommitment(expense, allocation, 1, 700000, id(`evidence-${label}`));
    return { allocation, expense };
  }

  it("rejects unauthorized writes", async function () {
    const { ledger, stranger } = await deploy();
    await expect(ledger.connect(stranger).recordAllocationCommitment(id("a"), id("c"), id("p"), 1))
      .to.be.revertedWithCustomError(ledger, "Unauthorized");
  });

  it("rejects duplicate evidence commitments", async function () {
    const { ledger, admin } = await deploy();
    await setup(ledger, admin, "first");
    const allocation = id("allocation-second");
    await ledger.recordAllocationCommitment(allocation, id("campaign-second"), id("books"), 1);
    await expect(ledger.recordExpenseCommitment(id("expense-second"), allocation, 1, 1, id("evidence-first")))
      .to.be.revertedWithCustomError(ledger, "DuplicateEvidenceCommitment")
      .withArgs(id("evidence-first"));
  });

  it("requires two distinct approvals before release", async function () {
    const { ledger, admin } = await deploy();
    const { allocation, expense } = await setup(ledger, admin, "approvals");
    await ledger.recordApprovalCommitment(expense, 1, 0, id("approver-a"));
    await expect(ledger.recordPayoutReleaseCommitment(id("payout-one"), expense, 1, 700000))
      .to.be.revertedWithCustomError(ledger, "MissingDualApprovalCommitment");
    await expect(ledger.recordApprovalCommitment(expense, 1, 1, id("approver-a")))
      .to.be.revertedWithCustomError(ledger, "DistinctApproversRequired");
    await ledger.recordApprovalCommitment(expense, 1, 1, id("approver-b"));
    await ledger.recordPayoutReleaseCommitment(id("payout-one"), expense, 1, 700000);
    expect(await ledger.releasedPayouts(id("payout-one"))).to.equal(true);
    expect(allocation).to.not.equal(ethers.ZeroHash);
  });

  it("blocks release while allocation is frozen", async function () {
    const { ledger, admin } = await deploy();
    const { allocation, expense } = await setup(ledger, admin, "frozen");
    await ledger.recordApprovalCommitment(expense, 1, 0, id("approver-a"));
    await ledger.recordApprovalCommitment(expense, 1, 1, id("approver-b"));
    await ledger.setAllocationFreezeStatus(allocation, true, id("fraud-reason"));
    await expect(ledger.recordPayoutReleaseCommitment(id("payout-frozen"), expense, 1, 1))
      .to.be.revertedWithCustomError(ledger, "AllocationFrozenError");
  });

  it("rejects replayed payout releases", async function () {
    const { ledger, admin } = await deploy();
    const { expense } = await setup(ledger, admin, "replay");
    await ledger.recordApprovalCommitment(expense, 1, 0, id("approver-a"));
    await ledger.recordApprovalCommitment(expense, 1, 1, id("approver-b"));
    const payout = id("payout-replay");
    await ledger.recordPayoutReleaseCommitment(payout, expense, 1, 1);
    await expect(ledger.recordPayoutReleaseCommitment(payout, expense, 1, 1))
      .to.be.revertedWithCustomError(ledger, "DuplicateReleaseCommitment");
  });

  it("anchors a public audit root without storing private metadata", async function () {
    const { ledger, auditor } = await deploy();
    await expect(ledger.connect(auditor).anchorAuditRoot(42, id("audit-root")))
      .to.emit(ledger, "AuditRootAnchored")
      .withArgs(42, id("audit-root"));
  });
});
