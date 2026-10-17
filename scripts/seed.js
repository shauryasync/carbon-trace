const hre = require("hardhat");
const deployed = require("../web/lib/abi/CarbonRegistry.json");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt(
    "CarbonRegistry",
    deployed.address,
    signer,
  );
  const evidence = hre.ethers.id("demo-evidence.pdf");
  const project = "DEMO-FOREST-" + Date.now(); // new name each run, so reruns don't clash

  console.log("Contract:", deployed.address);
  console.log("Seller wallet:", signer.address);

  console.log("\n1. Registering serials 1001-2000...");
  const tx = await c.registerBatch(project, 1001, 2000, evidence);
  await tx.wait();
  const batchId = Number(await c.batchCount()) - 1;
  console.log("   OK, batchId:", batchId);
  console.log("   https://sepolia.etherscan.io/tx/" + tx.hash);

  console.log("\n2. Fraudster tries to register 1500-1800 (overlap)...");
  try {
    await (await c.registerBatch(project, 1500, 1800, evidence)).wait();
    console.log("   PROBLEM: this should have been blocked!");
  } catch (e) {
    console.log("   BLOCKED:", e.reason || e.shortMessage || e.message);
  }

  console.log("\n3. Listing 500 credits for sale (start is fixed at 1001)...");
  const price = hre.ethers.parseUnits("1000", "wei"); // 1000 wei per credit
  const ltx = await c.createListing(batchId, 0, 500, price);
  await ltx.wait();
  const listingId = Number(await c.listingCount()) - 1;
  console.log("   OK, listingId:", listingId, "(serials 1001-1500)");

  const holdings = await c.getHoldings(batchId, signer.address);
  console.log(
    "\nSeller holds:",
    holdings.map((h) => `${h.start}-${h.end}`).join(", "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
