# Web Implementation

This document describes the current web API implementation, the files it uses,
how to call each endpoint, and how the frontend should work with them.

Carbon-Trace is a prototype on the Sepolia testnet with synthetic demo data.
It makes credit records unique, tamper-proof and publicly traceable. It does
**not** verify real-world carbon removal.

## Run the web application

From the repository root:

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Set these in `web/.env.local`. This file must **never** be committed.

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/carbontrace?retryWrites=true&w=majority
AUTH_SECRET=a-long-random-value-at-least-32-characters
```

Generate `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`AUTH_SECRET` signs the login cookie. If it leaks, anyone can forge a login, so
every environment (each teammate, and the deployed site) needs its own value.

Optional settings (the defaults work for the deployed Sepolia contract):

```
NEXT_PUBLIC_SEPOLIA_RPC_URL=...
NEXT_PUBLIC_CONTRACT_ADDRESS=...
```

The server and the browser both read these two. If the free public RPC is slow
or rate-limited, put an Alchemy or Infura Sepolia URL in
`NEXT_PUBLIC_SEPOLIA_RPC_URL`.

Next.js automatically loads `web/.env.local` when you run `npm run dev`,
`npm run build`, or `npm start`. Restart `npm run dev` after changing it;
Next.js only reads it on startup.

In MongoDB Atlas, open **Network Access** and allow your IP address (for a
prototype, "Allow access from anywhere" is fine). Keep a database name (such as
`/carbontrace`) in the URI before the `?`; without one, MongoDB uses a database
called `test`.

The development server is usually available at `http://localhost:3000`. Replace
that base URL with your deployed web application's URL when calling the API.
All request and response bodies described below use JSON.

## Testing the endpoints with Thunder Client

Every example below can be tried in the Thunder Client VS Code extension:

1. Click **New Request**.
2. Choose the method (GET or POST) in the dropdown and paste **only the URL**
   into the URL box (no method name, no trailing period).
3. For POST requests, open the **Body** tab, choose **JSON**, and paste the
   request body. Thunder Client sets the `Content-Type` header for you.
4. Click **Send** and read the status code and response on the right.

If a POST returns `400`, the `problems` list in the response names the bad
field. The most common causes are numbers wrapped in quotes (`"1000"` instead
of `1000`) or a hash that is not exactly `0x` plus 64 hex characters.

Some endpoints need a real wallet signature (login) or a real Sepolia
transaction hash. Thunder Client cannot sign with MetaMask, so use the helper
scripts in "Helper scripts" below for those.

## Implementation files

| File | Purpose |
| --- | --- |
| `app/api/health/route.ts` | Health/status endpoint. |
| `app/api/credits/route.ts` | Finds indexed batches by serial number and/or project ID. |
| `app/api/credits/[batchId]/route.ts` | Retrieves an indexed batch by its on-chain batch ID. |
| `app/api/credits/register/route.ts` | Login required. Reads a registration from the chain and saves it to MongoDB. |
| `app/api/credits/checkOverlap/route.ts` | Checks a project's proposed serial range against indexed batches. |
| `app/api/transfers/sync/route.ts` | Reads a purchase from the chain and saves the transfer. |
| `app/api/transfers/route.ts` | Transaction history, filterable by serial, batch, wallet or transaction. |
| `app/api/serials/[serial]/route.ts` | Public Verify route: the full story of one serial. |
| `app/api/auth/nonce/route.ts` | Step 1 of wallet login: returns the message to sign. |
| `app/api/auth/verify/route.ts` | Step 2 of wallet login: checks the signature and sets the login cookie. |
| `app/api/auth/me/route.ts` | Returns the logged-in company. |
| `app/api/auth/logout/route.ts` | Clears the login cookie. |
| `app/api/companies/route.ts` | Public lookup of company names for wallet addresses. |
| `app/api/review/route.ts` | Basic rule-based checks on evidence text (not AI). |
| `lib/mongo.ts` | Opens and caches the MongoDB connection (`connectMongo`). |
| `lib/chain.ts` | Reads and validates transactions and serial status on Sepolia. |
| `lib/session.ts` | Signs and reads the login cookie (`getSessionAddress`). |
| `lib/auth-client.ts` | Browser helpers: `loginWithWallet`, `getMe`, `logout`. |
| `lib/overlap.ts` | Validates serial ranges and checks inclusive range overlap (`findOverlap`, `rangesOverlap`, `hasOverlap`). |
| `lib/overlap.test.ts` | Unit tests for the overlap rule. |
| `lib/models/batch.ts` | `Batch` model in the shared data format, plus `toCredit()`. |
| `lib/models/transfer.ts` | `Transfer` model (one row per `CreditsTransferred` event), plus `toTransfer()`. |
| `lib/models/company.ts` | `Company` model (wallet address and self-declared name). |
| `lib/models/authChallenge.ts` | Pending logins (expire after 5 minutes). |
| `lib/mockData.ts` | Older development-only sample batches. No API route uses it any more. |

## How the data fits together

- **The blockchain is the source of truth.** MongoDB is only a fast search
  index and stores extra data such as `vintage` and company names.
- **The server never trusts the browser for chain facts.** Both
  `POST /api/credits/register` and `POST /api/transfers/sync` receive only a
  transaction hash, read the transaction from Sepolia, and store what the chain
  says.
- The contract keeps ownership as **ranges per wallet**, so it cannot answer
  "who owns serial X?" by itself. The backend answers it from the saved transfer
  history, then cross-checks the result against the contract.
- **Owner rule:** the owner of serial X in batch B is the buyer of the most
  recent transfer whose range contains X. If no transfer contains it, the owner
  is the batch's issuer.
- Records use the shared data format: `projectId`, `vintage`, `startSerial`,
  `endSerial`, `evidenceHash`, `issuer`, `status`, `txHash`, `auditor`. The API
  also returns `batchId`, the on-chain batch ID (a number: 0, 1, 2...).
- `projectId` is compared **exactly** (case-sensitive), matching the contract.
  `"kenya-001"` and `"KENYA-001"` are different projects.
- The same serial can exist in two different projects, so a serial lookup
  returns a list.

### The main flows

```
Register a batch
  Browser: registerBatch on-chain (MetaMask)          contract.ts
  Browser: POST /api/credits/register {txHash, vintage}   (logged in)
  Server:  reads the batch from Sepolia, checks the issuer is the logged-in
           wallet, saves it to MongoDB

Buy credits
  Browser: buy on-chain (MetaMask)                    contract.ts: buyListing
  Browser: POST /api/transfers/sync {txHash}
  Server:  reads the CreditsTransferred event from Sepolia, saves the transfer

Verify a serial (public, no login, no wallet)
  Browser: GET /api/serials/{serial}
  Server:  finds the batch and owner in MongoDB, confirms owner, retired status
           and auditor on-chain
```

## Endpoint overview

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | Is the service up? |
| `GET /api/credits` | Public | Search indexed batches. |
| `GET /api/credits/{batchId}` | Public | One indexed batch. |
| `POST /api/credits/checkOverlap` | Public | Friendly pre-check before registering. |
| `GET /api/serials/{serial}` | Public | Verify page data. |
| `GET /api/transfers` | Public | Transaction history. |
| `GET /api/companies` | Public | Company names for addresses. |
| `POST /api/transfers/sync` | Public (safe: reads the chain) | Save a purchase. |
| `POST /api/auth/nonce` | Public | Start wallet login. |
| `POST /api/auth/verify` | Public | Finish wallet login. |
| `GET /api/auth/me` | Needs the login cookie | Who am I? |
| `POST /api/auth/logout` | Public | Log out. |
| `POST /api/credits/register` | **Login required** | Save a registered batch. |
| `POST /api/review` | Public | Rule-based evidence text checks. |

## API routes

### `GET /api/health`

Returns a JSON status response indicating the service is reachable.

Thunder Client: **GET** `http://localhost:3000/api/health`

Response (`200 OK`):

```json
{
  "status": 200,
  "ok": true,
  "service": "Carbon Trace API",
  "mode": "development",
  "timestamp": "2026-10-13T10:00:00.000Z"
}
```

### `GET /api/credits`

Finds indexed batches. All query parameters are optional and can be combined:

| Parameter | Behavior |
| --- | --- |
| `serial` | Returns batches whose range contains this serial (inclusive). Must be a whole number >= 0. |
| `projectId` | Exact, case-sensitive match on `projectId`. |
| `query` | Case-insensitive substring match on `projectId`. Ignored if `projectId` is given. |

With no parameters, all batches are returned. Results are sorted by `batchId`
and limited to 50.

Thunder Client examples (all **GET**):

- `http://localhost:3000/api/credits`
- `http://localhost:3000/api/credits?serial=1500`
- `http://localhost:3000/api/credits?serial=1500&projectId=KENYA-001`
- `http://localhost:3000/api/credits?query=kenya`

Response (`200 OK`):

```json
{
  "count": 1,
  "credits": [
    {
      "batchId": 0,
      "projectId": "KENYA-001",
      "vintage": 2025,
      "startSerial": 1000,
      "endSerial": 2000,
      "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "issuer": "0x1111111111111111111111111111111111111111",
      "status": "issued",
      "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "auditor": "0x0000000000000000000000000000000000000000"
    }
  ]
}
```

No match returns `200 OK` with `count: 0` and an empty `credits` array.
`auditor` is the zero address until an approved auditor attests the batch, but
note that MongoDB's `status` and `auditor` are not kept up to date. For the
current retired status and auditor, use `GET /api/serials/{serial}`.

Errors:

- `400 Bad Request` if `serial` is not a whole number >= 0.
- `500 Internal Server Error` (`"Database error."`) if MongoDB cannot be
  reached. See "Troubleshooting" below.

### `GET /api/credits/{batchId}`

Retrieves one indexed batch by its on-chain batch ID (a whole number).

Thunder Client: **GET** `http://localhost:3000/api/credits/0`

Response (`200 OK`):

```json
{
  "credit": {
    "batchId": 0,
    "projectId": "KENYA-001",
    "vintage": 2025,
    "startSerial": 1000,
    "endSerial": 2000,
    "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "issuer": "0x1111111111111111111111111111111111111111",
    "status": "issued",
    "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "auditor": "0x0000000000000000000000000000000000000000"
  }
}
```

Errors:

- `400 Bad Request` if `batchId` is not a whole number >= 0.
- `404 Not Found` if no indexed batch has that ID:

```json
{
  "error": "Credit batch not found",
  "batchId": "99"
}
```

- `500 Internal Server Error` for database problems.

### `POST /api/credits/checkOverlap`

Checks whether a proposed inclusive serial range overlaps an indexed batch for
the **same** `projectId` (exact match, like the contract). This is read-only and
saves nothing. It is a friendly pre-check for the Register page; the contract is
the real gate.

Request:

```json
{
  "projectId": "KENYA-001",
  "startSerial": 1500,
  "endSerial": 1800
}
```

Thunder Client: **POST** `http://localhost:3000/api/credits/checkOverlap` with
the JSON body above.

Response when the range overlaps (`200 OK`):

```json
{
  "projectId": "KENYA-001",
  "startSerial": 1500,
  "endSerial": 1800,
  "overlap": true,
  "canRegister": false,
  "conflict": {
    "batchId": 0,
    "projectId": "KENYA-001",
    "vintage": 2025,
    "startSerial": 1000,
    "endSerial": 2000,
    "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "issuer": "0x1111111111111111111111111111111111111111",
    "status": "issued",
    "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "auditor": "0x0000000000000000000000000000000000000000"
  },
  "message": "This serial range overlaps an existing batch."
}
```

When no overlap is found, `overlap` is `false`, `canRegister` is `true`,
`conflict` is `null`, and the message says no overlap was found in the indexed
batches. Ranges are inclusive, so sharing an endpoint serial counts as an
overlap.

Errors:

- `400 Bad Request` if JSON is invalid, `projectId` is empty, or the range is
  not `0 <= startSerial <= endSerial` with whole numbers.
- `500 Internal Server Error` for database problems.

### `POST /api/credits/register`

**Login required.** Saves a batch that has been registered on-chain. The server
reads the transaction from Sepolia and stores what the **chain** says, so the
browser cannot supply fake batch data. Only `vintage`, which is not on-chain,
comes from the request. Any other fields in the body are ignored. The batch's
on-chain issuer must be the logged-in wallet.

Request:

```json
{
  "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "vintage": 2025
}
```

Response: `201 Created` for a new batch or `200 OK` if it was already saved:

```json
{
  "source": "chain",
  "replacedStaleRecord": false,
  "credit": {
    "batchId": 0,
    "projectId": "KENYA-001",
    "vintage": 2025,
    "startSerial": 1000,
    "endSerial": 2000,
    "evidenceHash": "0xaaaa...",
    "issuer": "0x1111...",
    "status": "issued",
    "txHash": "0xbbbb...",
    "auditor": "0x0000000000000000000000000000000000000000"
  }
}
```

New batches are saved with `status: "issued"` and the zero address as `auditor`.
`replacedStaleRecord` is `true` when an older record for the same `batchId`
(for example, test data) was overwritten with what the chain says.

Errors:

- `400 Bad Request` for invalid JSON or a bad `txHash`/`vintage` (see `problems`).
- `401 Unauthorized` if not logged in. The batch is already on-chain, so log in
  and send the same request again.
- `403 Forbidden` if the logged-in wallet is not the wallet that issued the batch.
- `404 Not Found` if the transaction is not on Sepolia yet (the server retries
  for a few seconds first).
- `409 Conflict` if two requests saved the same batch at the same moment. Retry.
- `422 Unprocessable Entity` if the transaction failed on-chain or did not emit
  `BatchRegistered` from the Carbon-Trace contract.
- `500 Internal Server Error` for database problems.

Overlapping ranges are not checked here: the contract itself rejects a
double-counting registration, so a transaction that succeeded is already valid.

### `POST /api/transfers/sync`

Saves a purchase. The server reads the `CreditsTransferred` event from Sepolia
and stores what the **chain** says. It needs only the transaction hash, so it is
safe to leave public. Sending the same hash again changes nothing, so retrying
is always safe.

Request:

```json
{ "txHash": "0x3e58fda916a8d6bcf0878bdf7e972e641657ec89b5a92f181adf504bc0ed6582" }
```

Response: `201 Created` if at least one new transfer was saved, `200 OK` if
everything was already saved:

```json
{
  "synced": 1,
  "alreadySynced": 0,
  "transfers": [
    {
      "txHash": "0x3e58...6582",
      "logIndex": 366,
      "listingId": 0,
      "batchId": 0,
      "seller": "0x9CE8...E0b1",
      "buyer": "0x3A02...175b",
      "startSerial": 1001,
      "endSerial": 1500,
      "totalPriceWei": "500000",
      "blockNumber": 11934849,
      "timestamp": 1792249020
    }
  ]
}
```

`totalPriceWei` is a string because wei amounts can be larger than JavaScript
numbers can hold exactly. `timestamp` is seconds since 1970 (multiply by 1000
for a JavaScript `Date`).

Errors:

- `400 Bad Request` for invalid JSON or a `txHash` that is not `0x` plus 64 hex
  characters.
- `404 Not Found` if the transaction is not on Sepolia yet.
- `422 Unprocessable Entity` if the transaction failed on-chain or contains no
  `CreditsTransferred` event from the Carbon-Trace contract.
- `500 Internal Server Error` (`"Sync failed."`).

### `GET /api/transfers`

The transaction history. Filters are optional and can be combined. Results are
newest first, limited to 50.

| Parameter | Behavior |
| --- | --- |
| `serial` | Transfers whose range contains this serial. |
| `batchId` | Transfers of this batch. |
| `address` | Transfers where this wallet was the seller **or** the buyer (any letter casing). |
| `txHash` | The transfer(s) in this transaction. |

Thunder Client examples (all **GET**):

- `http://localhost:3000/api/transfers?serial=1200`
- `http://localhost:3000/api/transfers?batchId=0`
- `http://localhost:3000/api/transfers?address=0x3A02a04DDCAD530b225E45d36a5E9b9f60eC175b`

Response (`200 OK`):

```json
{
  "count": 1,
  "transfers": [
    {
      "txHash": "0x3e58...6582",
      "logIndex": 366,
      "listingId": 0,
      "batchId": 0,
      "seller": "0x9CE8...E0b1",
      "buyer": "0x3A02...175b",
      "startSerial": 1001,
      "endSerial": 1500,
      "totalPriceWei": "500000",
      "blockNumber": 11934849,
      "timestamp": 1792249020
    }
  ]
}
```

Errors: `400` for a bad `serial`, `batchId` or `address`; `500` for database
problems.

### `GET /api/serials/{serial}`

**Public, read-only, no login.** This is the data for the Verify page. It
combines the batch, current owner, issuer, auditor, retired status and transfer
history for one serial, and confirms the important parts directly on the chain.

Thunder Client: **GET** `http://localhost:3000/api/serials/1200`

Response (`200 OK`):

```json
{
  "serial": 1200,
  "found": true,
  "matches": [
    {
      "batchId": 0,
      "projectId": "KENYA-001",
      "vintage": 2025,
      "startSerial": 1001,
      "endSerial": 2000,
      "evidenceHash": "0xaaaa...",
      "issuer": "0x9CE8...E0b1",
      "status": "issued",
      "statusSource": "chain",
      "txHash": "0xbbbb...",
      "auditor": null,
      "owner": "0x3A02...175b",
      "ownerSource": "transfer history",
      "ownershipConfirmedOnChain": true,
      "chain": {
        "checked": true,
        "retired": false,
        "auditor": null,
        "ownerHoldsSerial": true
      },
      "transfers": [ { "txHash": "0x3e58...6582", "...": "..." } ]
    }
  ]
}
```

`matches` is a list because the same serial can exist in different projects.
Field notes:

- `status` is `"retired"` if the chain says the serial is retired, otherwise the
  stored `"issued"` or `"flagged"`. `statusSource` is `"chain"` when it was
  confirmed on-chain and `"index (unverified)"` when the chain could not be read.
- `auditor` is the wallet that attested the batch, or `null` if nobody has (or
  if the chain could not be read).
- `owner` is the current owner. `ownerSource` is `"transfer history"` or
  `"issuer (never sold)"`.
- `ownershipConfirmedOnChain` is `true` when the contract confirms that wallet
  holds the serial, `false` when it does not, and `null` when the chain could not
  be read. When it is `false`, a `warning` string is included. This usually
  means a sale has not been synced yet, not fraud.
- If the chain could not be read for a match, `chain` is
  `{ "checked": false, "error": "..." }`. Records like this (for example
  seeded demo data) must be shown as **not verified on-chain**.

No match returns `200 OK`:

```json
{
  "serial": 99999999,
  "found": false,
  "matches": [],
  "message": "This serial is not in any batch the index knows about."
}
```

`found: false` means "not in the index", not "does not exist". A valid batch
that was never indexed will not appear.

Errors: `400` if `serial` is not a whole number >= 0; `500` for database
problems.

### Wallet login

Login is passwordless. The company proves it controls a wallet by signing a short
message in MetaMask (free, no transaction). The first login also creates the
company profile. A wallet maps to exactly one company.

```
1. POST /api/auth/nonce   {address}                       -> {message}
2. MetaMask signs the message
3. POST /api/auth/verify  {address, signature, companyName?} -> {company} + cookie
4. The browser now sends the cookie automatically; GET /api/auth/me shows who is logged in.
```

The frontend should use `loginWithWallet()` from `lib/auth-client.ts` instead of
calling these routes by hand (see the Frontend guide). The cookie is `httpOnly`
(page scripts cannot read it), `sameSite=lax`, and lasts 7 days. It is `secure`
in production.

#### `POST /api/auth/nonce`

Request: `{ "address": "0x..." }`

Response (`200 OK`):

```json
{
  "message": "localhost:3000 wants you to sign in with your wallet.\n\nWallet: 0x3A02...175b\nNonce: 9f2c...\nIssued: 2026-10-18T09:00:00.000Z\n\nThis proves you control this wallet. It costs no gas and sends no transaction."
}
```

The message contains a one-time random value (the nonce) and expires after 5
minutes. Requesting a new one replaces the old one.

Errors: `400` for an invalid address; `500` for database problems.

#### `POST /api/auth/verify`

Request:

```json
{
  "address": "0x3A02a04DDCAD530b225E45d36a5E9b9f60eC175b",
  "signature": "0x...",
  "companyName": "Example Carbon Co"
}
```

`companyName` is required only on a wallet's first login (2 to 80 characters).

Response (`200 OK`), plus a `Set-Cookie` header:

```json
{ "company": { "address": "0x3A02a04DDCAD530b225E45d36a5E9b9f60eC175b", "name": "Example Carbon Co" } }
```

Errors:

- `400 Bad Request` for an invalid address or missing signature.
- `400 Bad Request` (`"No active login request..."`) if the challenge expired or
  was never requested. Request a new one.
- `400 Bad Request` with `"needsCompanyName": true` if this is the wallet's first
  login and no company name was sent. The challenge is **not** used up, so the
  same signature can be sent again with a name.
- `401 Unauthorized` if the signature is invalid or was made by a different
  wallet.
- `409 Conflict` if the login request was already used.
- `500 Internal Server Error` (`"Login failed."`). A missing or short
  `AUTH_SECRET` also ends up here.

#### `GET /api/auth/me`

Needs the login cookie.

Response (`200 OK`): `{ "company": { "address": "0x...", "name": "..." } }`

Errors: `401` (`"Not logged in."`).

#### `POST /api/auth/logout`

Clears the cookie. Response (`200 OK`): `{ "ok": true }`

### `GET /api/companies`

Public lookup of company names for wallet addresses.

| Parameter | Behavior |
| --- | --- |
| `addresses` | 1 to 20 comma-separated wallet addresses (any letter casing). |

Thunder Client: **GET**
`http://localhost:3000/api/companies?addresses=0xAAA...,0xBBB...`

Response (`200 OK`):

```json
{
  "companies": { "0xAAA...": "Example Carbon Co" },
  "selfDeclared": true
}
```

Keys are the addresses exactly as you sent them. Addresses with no registered
company are left out. `selfDeclared` is a reminder: **company names are typed by
the company and are not verified.** Show them with that label.

Errors: `400` for an empty list, more than 20 addresses, or an invalid address;
`500` for database problems.

### `POST /api/review`

Checks submitted evidence text for four simple indicators: a methodology/method
reference, monitoring/measurement details, verification/audit details, and a
four-digit year. It is rule-based, not an AI review. A result never approves
the project; human review is always required. The AI evidence check was dropped
from this project's scope; verification through the Verra registry is future
scope. This route is not part of the main flows.

Request:

```json
{
  "projectId": "FOREST-DEMO-001",
  "evidenceText": "The methodology describes monitoring and measurement in 2025. An independent audit verified the results."
}
```

Response with all indicators present (`200 OK`):

```json
{
  "mode": "development",
  "projectId": "FOREST-DEMO-001",
  "reviewStatus": "no_flags_found",
  "flags": [],
  "requiresHumanReview": true,
  "approvalGranted": false,
  "disclaimer": "These are basic text checks, not an AI assessment or proof of carbon removal."
}
```

When one or more indicators are absent, `reviewStatus` is `needs_review` and
`flags` contains a message for each missing indicator.

Errors:

- `400 Bad Request` if JSON is invalid or `projectId`/`evidenceText` is absent,
  not a non-empty string, or has the wrong type.
- `413 Payload Too Large` if `evidenceText` exceeds 20,000 characters.

## Guide for the Frontend teammate

Everything below uses routes and helpers that already exist. You never need
`MONGODB_URI` or `AUTH_SECRET` in browser code, and you do not edit anything in
`web/lib` or `web/app/api`; ask the Backend owner if something is missing.

### Rules

- The **Verify page is public and stateless**: no login, no MetaMask, no Web3
  provider. It only calls `GET /api/serials/{serial}` (and optionally
  `GET /api/companies`).
- **Register, Buy and Sell** are guarded: the user must be logged in **and**
  have a wallet connected.
- Show company names with a **"self-declared"** label. Show serials, owners and
  statuses exactly as the API returns them.
- Never present anything as "approved" or "verified carbon removal". We make
  records unique and traceable; we do not verify real-world removal.

### 1. Log in

```ts
import { loginWithWallet, getMe, logout } from "@/lib/auth-client";

// Login button handler. Pass the company name from a form field.
// The name is only needed on a wallet's FIRST login.
async function onLogin(companyName?: string) {
  try {
    const company = await loginWithWallet(companyName);
    // company = { address, name }
  } catch (e: any) {
    if (e.needsCompanyName) {
      // Show the "Company name" field and let the user try again.
    } else {
      // Show e.message (for example "You cancelled the transaction.").
    }
  }
}
```

MetaMask opens a readable message to sign. It costs no gas.

The login form should say that the company name will be **public**.

### 2. Guard the Register, Buy and Sell pages

```ts
"use client";
import { useEffect, useState } from "react";
import { getMe, type CompanyProfile } from "@/lib/auth-client";

const [company, setCompany] = useState<CompanyProfile | null>(null);
const [checked, setChecked] = useState(false);

useEffect(() => {
  getMe().then((c) => { setCompany(c); setChecked(true); });
}, []);

// while !checked      -> show a loading state
// if checked && !company -> show the login button (or redirect to the login page)
```

`getMe()` returns `null` when nobody is logged in. Use `logout()` for a logout
button, then clear your local `company` state.

### 3. Register page

1. If `company` is `null`, ask the user to log in first.
2. Optional friendly pre-check while the user types:
   `POST /api/credits/checkOverlap` with `{ projectId, startSerial, endSerial }`.
   If `overlap` is `true`, show the `conflict` batch and why it blocks.
3. Call `registerBatch(...)` from `lib/contract.ts`. If the batch overlaps an
   existing one, the **contract** reverts with
   `"Overlaps existing batch: double counting blocked!"`. That message is the
   on-chain proof; show it, along with `readableError(e)` and a link made with
   `explorerTx(hash)` when you have a hash.
4. `registerBatch` also tells the backend. Check the `indexed` and `indexError`
   it returns:
   - `indexed: true`: show success.
   - `indexed: false`: the batch **is on-chain** but the search index does not
     have it yet. Show "Registered on-chain; search index not updated yet" and a
     **Retry** button that calls `indexBatch(result.payload)` again. The common
     cause is a `401` (not logged in) or a `403` (logged in with a different
     wallet than the one MetaMask used to register). Retrying is always safe.

### 4. Buy page

1. Guard it as above, and read the marketplace straight from the chain with
   `getListing(id)` and `getHoldings(batchId, wallet)` from `lib/contract.ts`
   (listings are numbered 0, 1, 2...). `contract.ts` does not export a listing
   counter yet; ask the Chain owner to add one (a small `getListingCount()` that
   calls the contract's `listingCount()`), or loop `getListing(id)` from 0 until
   it fails. No backend call is needed to list sales.
2. Call `buyListing(listingId)`. After the purchase is mined, the transaction
   must be synced to the backend with `POST /api/transfers/sync` and
   `{ txHash }`. The Chain owner adds this call to `buyListing` as
   `indexTransfer(txHash)` and returns `indexed` and `indexError`, the same way
   `registerBatch` does. Until that change is merged, call the route yourself
   with the `txHash` from the result.
3. If syncing fails, show "Purchase confirmed on-chain, history not updated yet"
   and a **Retry** button. Retrying is safe: syncing the same transaction twice
   does nothing.
4. A listing can become invalid after someone else buys the same serials. The
   contract then reverts with `"Listing no longer valid"`; show that message and
   refresh the list.

### 5. Verify page (public)

```ts
const res = await fetch(`/api/serials/${serial}`);
const data = await res.json();

if (!res.ok) { /* data.error, for example "serial must be a whole number." */ }
else if (!data.found) { /* "Not found in the index" - NOT "does not exist" */ }
else {
  for (const m of data.matches) {
    // render one card per match (the same serial can exist in several projects)
  }
}
```

Show on each card:

| Show | Field |
| --- | --- |
| Project and vintage | `projectId`, `vintage` |
| Status badge | `status` (`issued`, `retired`, `flagged`). Make `retired` very prominent. |
| Issuer | `issuer` (and its company name, if any) |
| Auditor | `auditor`, or "not yet attested" when `null` |
| Current owner | `owner`, with `ownerSource` as a small note |
| Transaction history | `transfers` (newest first). Link each with `explorerTx(t.txHash)`. |
| On-chain check | `ownershipConfirmedOnChain` and the `warning` text when present |

Rules for the badges and notes:

- If `chain.checked` is `false`, label the whole card **"not verified on-chain"**.
  Never show a green "verified" style on it.
- If `statusSource` is `"index (unverified)"`, do not present the status as
  confirmed.
- If `warning` is present, show it as a gentle note, not an error: it usually
  means a recent sale has not been synced yet.
- `vintage` is reported by the issuer and is not proven on-chain. Do not label it
  "verified".

The QR code should encode the URL of the Verify page with the serial in it. Keep
the page itself free of any login or wallet code.

### 6. Show company names instead of raw addresses

One request can look up every address on the page:

```ts
const addrs = [...new Set([m.owner, m.issuer, ...m.transfers.flatMap((t) => [t.seller, t.buyer])])];
const { companies } = await (await fetch(`/api/companies?addresses=${addrs.join(",")}`)).json();

// companies[addr] ?? shortAddress(addr)   - and add a "self-declared" label
```

The lookup accepts at most 20 addresses per call.

### 7. Company dashboard

- A company's transaction history: `GET /api/transfers?address=<wallet>`. Show
  "Sold" when `seller` equals the wallet and "Bought" when `buyer` does (compare
  addresses ignoring letter casing).
- A company's current holdings: `getHoldings(batchId, wallet)` from
  `lib/contract.ts` (read straight from the chain).

### Common API errors and what to show

| Status | Where | Show |
| --- | --- | --- |
| `400` | any | The `error` or the `problems` list. |
| `401` | register, `me` | "Please log in with your wallet." |
| `403` | register | "You are logged in with a different wallet than the one that issued this batch." |
| `404` | sync, register | "Transaction not found on Sepolia yet. Wait a few seconds and retry." |
| `422` | sync, register | "That transaction does not contain what we expected." |
| `500` | any | "Something went wrong on our side. Try again." |

## Helper scripts

Run these from inside `web/` with `npm run dev` running where noted. Never put a
private key in any script: the scripts that log in create a throwaway wallet.

| Script | What it does |
| --- | --- |
| `npx tsx --test lib/overlap.test.ts` | Unit tests for the overlap rule. |
| `npx tsx --env-file=.env.local lib/chain-check.ts batch <txHash>` | Reads a registration from Sepolia and prints what the chain recorded. |
| `npx tsx --env-file=.env.local lib/chain-check.ts transfer <txHash>` | Reads a purchase from Sepolia and prints the transfers. |
| `npx tsx lib/auth-check.ts` | Plays the whole wallet login with a throwaway wallet, including attacks (forged signature, replay, tampered cookie). Eight lines should say `PASS`. |
| `npx tsx lib/register-auth-check.ts <txHash>` | Checks that register refuses logged-out users and the wrong wallet. |
| `npx tsx --env-file=.env.local lib/db-check.ts` | Prints which database you are connected to and how many documents each collection holds. |
| `npx tsx --env-file=.env.local lib/seed.ts` | Loads synthetic demo batches (`batchId` 9001 and up, `SEED-` project IDs). Safe to re-run. |

Seeded rows exist only in MongoDB, not on-chain, so the Verify route reports them
as not verified on-chain. Delete them (everything with `batchId` of 9001 or more)
before a live demo, or say clearly that they are synthetic.

## Running the overlap tests

From inside `web/`:

```bash
npx tsx --test lib/overlap.test.ts
```

The tests cover the main cases: `1000-2000` vs `1500-1800` overlaps,
`1000-2000` vs `2001-3000` does not, sharing an endpoint serial overlaps, the
same serials in a different project are allowed, `projectId` is case-sensitive,
and an invalid range throws.

## Troubleshooting

A `500` with `"Database error."` means the database step failed. The real reason
is printed in the terminal running `npm run dev`, and in development the
response may include a `detail` field. Common causes:

- `MONGODB_URI is not set`: add it to `web/.env.local` and restart `npm run dev`.
- Timeout or "IP not whitelisted": allow your IP in Atlas under Network Access.
- `bad auth`: wrong username or password in the URI. URL-encode symbols such as
  `@` in the password.
- `AUTH_SECRET is missing or too short`: add a 32+ character value to
  `web/.env.local` and restart. It shows up as a failed login or `me` call.
- Import errors about `@/lib/models/batch`: the file name and every import must
  use exactly the same capitalization.

Other problems:

- **Data is "not stored" in Atlas:** run `lib/db-check.ts`. If the database it
  prints is `test`, your URI has no database name. Collections are lowercase and
  plural (`companies`, `batches`, `transfers`). Click refresh in Atlas after
  writing; it does not update on its own.
- **Sync or register returns `404` for a real hash:** the server's RPC node can
  lag a few seconds. The server already retries for about six seconds; wait a
  moment and send it again.
- **Random chain timeouts:** switch `NEXT_PUBLIC_SEPOLIA_RPC_URL` to an Alchemy
  or Infura Sepolia URL.
- **`needsCompanyName` on login:** it is the wallet's first login; send a company
  name.
- **"No active login request..." on verify:** the message expired (5 minutes) or
  was already used. Start the login again.

## Limitations

- **MongoDB is an index, not the source of truth.** Registration and transfer
  routes read the chain and store what it says, but the index can still be
  behind. A batch that was registered on-chain but never indexed shows as "not
  found" on the Verify page. Re-send its `txHash` to `POST /api/credits/register`
  (as the issuer, logged in) to recover it.
- **Ownership is computed from synced transfers.** A purchase that was never
  synced makes the stored owner wrong. The Verify route cross-checks with the
  contract and shows a `warning` when they disagree. Any sale can be repaired by
  sending its `txHash` to `POST /api/transfers/sync`.
- The routes do not wait for extra block confirmations, so a chain
  reorganization could in theory undo a transaction. Acceptable on a testnet;
  do not call the index "final".
- `status` and `auditor` stored in MongoDB are set when a batch is saved and are
  not updated when credits are retired or an auditor attests. Pages that show
  retirement or attestation must use `GET /api/serials/{serial}` (which reads the
  chain) or the contract.
- The contract retires one serial at a time, while `status` in MongoDB is stored
  per batch.
- **Contract limits (the contract is frozen):** anyone can call `retire()` (no
  ownership check), a retired serial can still be listed and sold, listings are
  not locked (several listings can claim the same serials, and only the first
  buyer succeeds), and the on-chain overlap loop only scales to a prototype.
  The Verify page shows retired status regardless of owner.
- **Login proves control of a wallet, not that the company is real.** Company
  names are self-declared and public. Login only gates the website: anyone can
  still call the contract directly with any wallet. There is no rate limiting on
  the auth routes, and the login cookie is a custom signed token rather than a
  battle-tested library. Fine for a prototype, not for production.
- `vintage` is reported by the issuer and is not stored on-chain.
- `/api/review` uses keyword/year checks only and does not verify real-world
  carbon removal. Verification through the Verra registry is future scope; no
  Verra integration exists today.
- All data is a prototype with synthetic data on a testnet.