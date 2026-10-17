import { Contract, Interface, JsonRpcProvider, type TransactionReceipt } from "ethers";
import deployed from "./abi/CarbonRegistry.json";

const RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deployed.address;

const iface = new Interface(deployed.abi);
const HASH = /^0x[a-fA-F0-9]{64}$/;

// A friendly error that carries the HTTP status the API route should return.
export class ChainError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getReceipt(txHash: string) {
  if (!HASH.test(txHash)) {
    throw new ChainError("txHash must be 0x + 64 hex characters", 400);
  }
  const provider = new JsonRpcProvider(RPC_URL);

  // The server's RPC node can lag a few seconds behind the browser's.
  let receipt: TransactionReceipt | null = null;
  for (let i = 0; i < 5 && !receipt; i++) {
    receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) await sleep(1500);
  }
  if (!receipt) {
    throw new ChainError("Transaction not found on Sepolia yet. Wait a few seconds and try again.", 404);
  }
  if (receipt.status !== 1) {
    throw new ChainError("That transaction failed on-chain.", 422);
  }
  return { receipt, provider };
}

// Only events emitted BY OUR CONTRACT count. A lookalike contract could emit
// an event with the same name, so we check the log's address.
function ourEvents(receipt: TransactionReceipt, name: string) {
  const found: { args: any; index: number }[] = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ADDRESS.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed && parsed.name === name) found.push({ args: parsed.args, index: log.index });
    } catch {
      // not one of our events, skip it
    }
  }
  return found;
}

// Confirms a registerBatch transaction and returns what the CHAIN says.
export async function readBatchRegistration(txHash: string) {
  const { receipt, provider } = await getReceipt(txHash);
  const events = ourEvents(receipt, "BatchRegistered");
  if (events.length === 0) {
    throw new ChainError("No BatchRegistered event from the Carbon-Trace contract in this transaction.", 422);
  }
  const { args } = events[0];
  const batchId = Number(args.batchId);

  // The event has no evidenceHash or issuer, so read them from the contract.
  const c = new Contract(ADDRESS, deployed.abi, provider);
  const b = await c.batches(batchId);

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    batchId,
    projectId: String(args.projectId),
    startSerial: Number(args.start),
    endSerial: Number(args.end),
    evidenceHash: String(b.evidenceHash),
    issuer: String(b.issuer),
  };
}

// Confirms a buy transaction and returns every CreditsTransferred event in it.
export async function readTransfers(txHash: string) {
  const { receipt } = await getReceipt(txHash);
  const events = ourEvents(receipt, "CreditsTransferred");
  if (events.length === 0) {
    throw new ChainError("No CreditsTransferred event from the Carbon-Trace contract in this transaction.", 422);
  }
  return events.map(({ args, index }) => ({
    txHash,
    logIndex: index, // txHash + logIndex is a unique key for one transfer
    listingId: Number(args.listingId),
    batchId: Number(args.batchId),
    seller: String(args.seller),
    buyer: String(args.buyer),
    startSerial: Number(args.start),
    endSerial: Number(args.end),
    totalPriceWei: String(args.totalPrice),
    blockNumber: Number(args.blockNumber),
    timestamp: Number(args.timestamp),
  }));
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Read-only checks against the chain for one serial. No wallet needed.
export async function readSerialOnChain(batchId: number, serial: number, owner: string) {
  const c = new Contract(ADDRESS, deployed.abi, new JsonRpcProvider(RPC_URL));
  const [b, retired, holdings] = await Promise.all([
    c.batches(batchId),
    c.isRetired(batchId, serial),
    c.getHoldings(batchId, owner),
  ]);
  return {
    auditor: b.auditor === ZERO_ADDRESS ? null : (String(b.auditor) as string | null),
    retired: Boolean(retired),
    // true if the contract says this wallet currently holds this serial
    ownerHoldsSerial: (holdings as any[]).some(
      (h) => serial >= Number(h.start) && serial <= Number(h.end),
    ),
  };
}