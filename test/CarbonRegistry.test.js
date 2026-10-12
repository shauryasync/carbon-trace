const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("CarbonRegistry", function () {
  async function deploy() {
    const [owner, issuer, auditor, other] = await ethers.getSigners();
    const registry = await ethers.deployContract("CarbonRegistry");
    await registry.waitForDeployment();
    const evidence = ethers.id("evidence.pdf");
    return { registry, owner, issuer, auditor, other, evidence };
  }

  it("registers a batch", async function () {
    const { registry, issuer, evidence } = await loadFixture(deploy);
    await expect(
      registry.connect(issuer).registerBatch("KENYA-001", 1000, 2000, evidence),
    )
      .to.emit(registry, "BatchRegistered")
      .withArgs(0, "KENYA-001", 1000, 2000);
  });

  it("blocks an overlapping batch (double counting)", async function () {
    const { registry, issuer, other, evidence } = await loadFixture(deploy);
    await registry
      .connect(issuer)
      .registerBatch("KENYA-001", 1000, 2000, evidence);
    await expect(
      registry.connect(other).registerBatch("KENYA-001", 1500, 1800, evidence),
    ).to.be.revertedWith("Overlaps existing batch: double counting blocked!");
  });

  it("allows a non-overlapping batch in the same project", async function () {
    const { registry, issuer, evidence } = await loadFixture(deploy);
    await registry
      .connect(issuer)
      .registerBatch("KENYA-001", 1000, 2000, evidence);
    await expect(
      registry.connect(issuer).registerBatch("KENYA-001", 2001, 3000, evidence),
    ).to.not.be.reverted;
  });

  it("rejects a bad range", async function () {
    const { registry, issuer, evidence } = await loadFixture(deploy);
    await expect(
      registry.connect(issuer).registerBatch("KENYA-001", 2000, 1000, evidence),
    ).to.be.revertedWith("Bad range: start must be <= end");
  });

  it("retires a credit once and blocks the second retire", async function () {
    const { registry, issuer, evidence } = await loadFixture(deploy);
    await registry
      .connect(issuer)
      .registerBatch("KENYA-001", 1000, 2000, evidence);
    await registry.retire(0, 1500);
    expect(await registry.isRetired(0, 1500)).to.equal(true);
    await expect(registry.retire(0, 1500)).to.be.revertedWith(
      "Credit already retired!",
    );
  });

  it("rejects retiring a serial outside the batch", async function () {
    const { registry, issuer, evidence } = await loadFixture(deploy);
    await registry
      .connect(issuer)
      .registerBatch("KENYA-001", 1000, 2000, evidence);
    await expect(registry.retire(0, 5000)).to.be.revertedWith(
      "Serial not in batch range",
    );
  });

  it("only the owner can add an auditor", async function () {
    const { registry, other, auditor } = await loadFixture(deploy);
    await expect(
      registry.connect(other).addAuditor(auditor.address),
    ).to.be.revertedWith("Only owner");
  });

  it("lets only an approved auditor attest, and only once", async function () {
    const { registry, owner, issuer, auditor, other, evidence } =
      await loadFixture(deploy);
    await registry
      .connect(issuer)
      .registerBatch("KENYA-001", 1000, 2000, evidence);

    await expect(registry.connect(other).attest(0)).to.be.revertedWith(
      "Not an auditor",
    );

    await registry.connect(owner).addAuditor(auditor.address);
    await expect(registry.connect(auditor).attest(0))
      .to.emit(registry, "BatchAttested")
      .withArgs(0, auditor.address);

    const batch = await registry.batches(0);
    expect(batch.auditor).to.equal(auditor.address);

    await expect(registry.connect(auditor).attest(0)).to.be.revertedWith(
      "Already attested",
    );
  });
});
