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

export type BatchMeta = { vintage: number };

export type IndexPayload = {
  batchId: number;
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidenceHash: string;
  issuer: string;
  txHash: string;
  status: "issued";
  auditor: null;
  chainId: number;
};

// Sends the saved-on-chain batch to the backend. Never throws.
export async function indexBatch(payload: IndexPayload) {
  try {
    const res = await fetch("/api/credits/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { indexed: false, indexError: await res.text() };
    return { indexed: true, indexError: null };
  } catch (e) {
    return { indexed: false, indexError: readableError(e) };
  }
}

export async function registerBatch(
  projectId: string,
  startSerial: number,
  endSerial: number,
  evidenceHash: string,
  meta: BatchMeta,
) {
  const c = await writeContract();
  const tx = await c.registerBatch(
    projectId,
    startSerial,
    endSerial,
    evidenceHash,
  );
  const receipt = await tx.wait(); // throws if the chain rejects it, so nothing below runs

  const log = receipt.logs
    .map((l: any) => {
      try {
        return c.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((p: any) => p?.name === "BatchRegistered");
  const batchId = Number(log?.args.batchId);

  const payload: IndexPayload = {
    batchId,
    projectId,
    vintage: meta.vintage,
    startSerial,
    endSerial,
    evidenceHash,
    issuer: receipt.from,
    txHash: tx.hash,
    status: "issued",
    auditor: null,
    chainId: 11155111,
  };

  const { indexed, indexError } = await indexBatch(payload);
  return { txHash: tx.hash as string, batchId, indexed, indexError, payload };
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

export async function createListing(
  batchId: number,
  holdingIndex: number,
  quantity: number,
  pricePerCreditWei: bigint,
) {
  const c = await writeContract();
  const tx = await c.createListing(
    batchId,
    holdingIndex,
    quantity,
    pricePerCreditWei,
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
    .find((p: any) => p?.name === "ListingCreated");
  return {
    txHash: tx.hash as string,
    listingId: Number(log?.args.listingId),
    startSerial: Number(log?.args.start),
    endSerial: Number(log?.args.end),
  };
}

export async function indexTransfer(txHash: string) {
  try {
    const res = await fetch("/api/transfers/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    if (!res.ok) return { indexed: false, indexError: await res.text() };
    return { indexed: true, indexError: null };
  } catch (e) {
    return { indexed: false, indexError: readableError(e) };
  }
}

export async function buyListing(listingId: number) {
  const reader = readContract();
  const l = await reader.listings(listingId);
  const total =
    (BigInt(l.end) - BigInt(l.start) + BigInt(1)) * BigInt(l.pricePerCredit);

  const c = await writeContract();
  const tx = await c.buy(listingId, { value: total });
  const receipt = await tx.wait();
  const log = receipt.logs
    .map((x: any) => {
      try {
        return c.interface.parseLog(x);
      } catch {
        return null;
      }
    })
    .find((p: any) => p?.name === "CreditsTransferred");
  const { indexed, indexError } = await indexTransfer(tx.hash);
  return {
    txHash: tx.hash as string,
    blockNumber: Number(log?.args.blockNumber),
    timestamp: Number(log?.args.timestamp),
    batchId: Number(log?.args.batchId),
    seller: log?.args.seller as string,
    buyer: log?.args.buyer as string,
    startSerial: Number(log?.args.start),
    endSerial: Number(log?.args.end),
    totalPriceWei: String(log?.args.totalPrice),
    indexed,
    indexError,
  };
}

export async function getHoldings(batchId: number, who: string) {
  const hs = await readContract().getHoldings(batchId, who);
  return hs.map((h: any) => ({
    startSerial: Number(h.start),
    endSerial: Number(h.end),
  }));
}

export async function getListing(listingId: number) {
  const l = await readContract().listings(listingId);
  return {
    listingId,
    batchId: Number(l.batchId),
    seller: l.seller as string,
    startSerial: Number(l.start),
    endSerial: Number(l.end),
    pricePerCreditWei: String(l.pricePerCredit),
    active: l.active as boolean,
  };
}

export async function cancelListing(listingId: number) {
  const c = await writeContract();
  const tx = await c.cancelListing(listingId);
  await tx.wait();
  return tx.hash as string;
}
