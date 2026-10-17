const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Trading (atomic buy/sell)", function () {
  const PRICE = 1000n; // wei per credit

  async function setup() {
    const [deployer, A, B, C] = await ethers.getSigners();
    const registry = await ethers.deployContract("CarbonRegistry");
    await registry.waitForDeployment();
    // A registers 1001-2000 and so holds all of it
    await registry
      .connect(A)
      .registerBatch("P1", 1001, 2000, ethers.id("e.pdf"));
    return { registry, A, B, C };
  }

  const range = (h) => [Number(h.start), Number(h.end)];

  it("moves serials and money together (A sells 500 to B)", async function () {
    const { registry, A, B } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 500, PRICE);
    const total = 500n * PRICE;

    await expect(
      registry.connect(B).buy(0, { value: total }),
    ).to.changeEtherBalances([A, B], [total, -total]);

    const a = await registry.getHoldings(0, A.address);
    const b = await registry.getHoldings(0, B.address);
    expect(range(a[0])).to.deep.equal([1501, 2000]);
    expect(range(b[0])).to.deep.equal([1001, 1500]);
  });

  it("emits an event with block details", async function () {
    const { registry, A, B } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 500, PRICE);
    const tx = await registry.connect(B).buy(0, { value: 500n * PRICE });
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((l) => {
        try {
          return registry.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p) => p && p.name === "CreditsTransferred");
    expect(parsed.args.seller).to.equal(A.address);
    expect(parsed.args.buyer).to.equal(B.address);
    expect(Number(parsed.args.start)).to.equal(1001);
    expect(Number(parsed.args.end)).to.equal(1500);
    expect(Number(parsed.args.blockNumber)).to.equal(receipt.blockNumber);
  });

  it("reverts everything if payment is wrong (nothing changes)", async function () {
    const { registry, A, B } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 500, PRICE);
    await expect(registry.connect(B).buy(0, { value: 1n })).to.be.revertedWith(
      "Wrong payment amount",
    );
    const a = await registry.getHoldings(0, A.address);
    expect(range(a[0])).to.deep.equal([1001, 2000]);
    expect((await registry.getHoldings(0, B.address)).length).to.equal(0);
    expect((await registry.listings(0)).active).to.equal(true);
  });

  it("cannot sell more than you hold, or buy your own listing", async function () {
    const { registry, A } = await loadFixture(setup);
    await expect(
      registry.connect(A).createListing(0, 0, 1001, PRICE),
    ).to.be.revertedWith("Bad quantity");
    await registry.connect(A).createListing(0, 0, 100, PRICE);
    await expect(
      registry.connect(A).buy(0, { value: 100n * PRICE }),
    ).to.be.revertedWith("Cannot buy your own listing");
  });

  it("a stale listing cannot be bought after the serials are sold", async function () {
    const { registry, A, B, C } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 500, PRICE); // listing 0: 1001-1500
    await registry.connect(A).createListing(0, 0, 300, PRICE); // listing 1: 1001-1300
    await registry.connect(B).buy(0, { value: 500n * PRICE });
    await expect(
      registry.connect(C).buy(1, { value: 300n * PRICE }),
    ).to.be.revertedWith("Listing no longer valid");
  });

  it("merges adjacent ranges for the buyer", async function () {
    const { registry, A, B } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 500, PRICE);
    await registry.connect(B).buy(0, { value: 500n * PRICE });
    await registry.connect(A).createListing(0, 0, 300, PRICE); // now 1501-1800
    await registry.connect(B).buy(1, { value: 300n * PRICE });
    const b = await registry.getHoldings(0, B.address);
    expect(b.length).to.equal(1);
    expect(range(b[0])).to.deep.equal([1001, 1800]);
  });

  it("cancelled listings cannot be bought", async function () {
    const { registry, A, B } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 100, PRICE);
    await registry.connect(A).cancelListing(0);
    await expect(
      registry.connect(B).buy(0, { value: 100n * PRICE }),
    ).to.be.revertedWith("Listing not active");
  });

  it("selling the whole holding empties the seller", async function () {
    const { registry, A, B } = await loadFixture(setup);
    await registry.connect(A).createListing(0, 0, 1000, PRICE);
    await registry.connect(B).buy(0, { value: 1000n * PRICE });
    expect((await registry.getHoldings(0, A.address)).length).to.equal(0);
    expect(range((await registry.getHoldings(0, B.address))[0])).to.deep.equal([
      1001, 2000,
    ]);
  });
});
