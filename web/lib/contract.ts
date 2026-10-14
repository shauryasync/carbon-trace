import { BrowserProvider, Contract, JsonRpcProvider, keccak256 } from "ethers";
import deployed from "./abi/CarbonRegistry.json";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deployed.address;

export type ChainBatch = {
  batchId: number;
  projectId: string;
  startSerial: number;
  endSerial: number;
  evidenceHash: string;
  issuer: string;
  auditor: string | null;
};

// Read-only: no wallet needed. Used by the Verify page.
function readContract() {
  return new Contract(ADDRESS, deployed.abi, new JsonRpcProvider(RPC_URL));
}

// Write: needs MetaMask. Used by the Register page.
async function writeContract() {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found. Please install it.");
  await eth.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: SEPOLIA_CHAIN_ID }],
  });
  const signer = await new BrowserProvider(eth).getSigner();
  return new Contract(ADDRESS, deployed.abi, signer);
}

// Hash the evidence PDF so only the fingerprint goes on-chain.
export async function hashFile(file: File): Promise<string> {
  return keccak256(new Uint8Array(await file.arrayBuffer()));
}

// Turn ugly errors into messages a human can read.
export function readableError(e: any): string {
  if (e?.code === "ACTION_REJECTED") return "You cancelled the transaction.";
  return e?.reason || e?.shortMessage || e?.message || "Something went wrong.";
}

export async function registerBatch(
  projectId: string,
  startSerial: number,
  endSerial: number,
  evidenceHash: string,
) {
  const c = await writeContract();
  const tx = await c.registerBatch(
    projectId,
    startSerial,
    endSerial,
    evidenceHash,
  );
  const receipt = await tx.wait();
  const log = receipt.logs
    .map((l: any) => {
      try {
        return c.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((p: any) => p?.name === "BatchRegistered");
  return { txHash: tx.hash as string, batchId: Number(log?.args.batchId) };
}

export async function getBatch(batchId: number): Promise<ChainBatch> {
  const b = await readContract().batches(batchId);
  const zero = "0x0000000000000000000000000000000000000000";
  return {
    batchId,
    projectId: b.projectId,
    startSerial: Number(b.start),
    endSerial: Number(b.end),
    evidenceHash: b.evidenceHash,
    issuer: b.issuer,
    auditor: b.auditor === zero ? null : b.auditor,
  };
}

// Verify page: find which batch (if any) contains a serial.
export async function findBySerial(serial: number, projectId?: string) {
  const c = readContract();
  const count = Number(await c.batchCount());
  for (let i = 0; i < count; i++) {
    const b = await getBatch(i);
    const inRange = serial >= b.startSerial && serial <= b.endSerial;
    if (inRange && (!projectId || b.projectId === projectId)) {
      const retired: boolean = await c.isRetired(i, serial);
      return { ...b, status: retired ? "retired" : "issued" };
    }
  }
  return null;
}

export async function retireCredit(batchId: number, serial: number) {
  const c = await writeContract();
  const tx = await c.retire(batchId, serial);
  await tx.wait();
  return tx.hash as string;
}

export const explorerTx = (hash: string) =>
  `https://sepolia.etherscan.io/tx/${hash}`;
