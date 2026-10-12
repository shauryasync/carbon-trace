const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const registry = await hre.ethers.deployContract("CarbonRegistry");
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("CarbonRegistry deployed to:", address);

  const artifact = await hre.artifacts.readArtifact("CarbonRegistry");
  const dir = path.join(__dirname, "..", "web", "lib", "abi");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "CarbonRegistry.json"),
    JSON.stringify(
      { address, network: hre.network.name, abi: artifact.abi },
      null,
      2,
    ),
  );
  console.log("ABI saved to web/lib/abi/CarbonRegistry.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
