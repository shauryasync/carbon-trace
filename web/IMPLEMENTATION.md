# Web Implementation

This document describes the current web API implementation, the files it uses,
and how to call each endpoint.

## Run the web application

From the repository root:

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Before starting the app, set your MongoDB connection string in `.env.local`:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/carbontrace?retryWrites=true&w=majority
```

Next.js automatically loads `web/.env.local` when you run `npm run dev`,
`npm run build`, or `npm start`. Contract address and Sepolia RPC settings are
optional and can be set there to override their defaults.

In MongoDB Atlas, open **Network Access** and allow your IP address (for a
prototype, "Allow access from anywhere" is fine). Restart `npm run dev` after
changing `.env.local`; Next.js only reads it on startup.

The development server is usually available at `http://localhost:3000`. Replace
that base URL with your deployed web application's URL when calling the API.
All request and response bodies described below use JSON.

## Testing the endpoints with Thunder Client

Every example below can be tried in the Thunder Client VS Code extension:

1. Click **New Request**.
2. Choose the method (GET or POST) and paste the URL.
3. For POST requests, open the **Body** tab, choose **JSON**, and paste the
   request body. Thunder Client sets the `Content-Type` header for you.
4. Click **Send** and read the status code and response on the right.

If a POST returns `400`, the `problems` list in the response names the bad
field. The most common causes are numbers wrapped in quotes (`"1000"` instead
of `1000`), a hash that is not exactly `0x` plus 64 hex characters, or a
missing `txHash` or `batchId`.

## Implementation files

The current API implementation consists of:

| File | Purpose |
| --- | --- |
| `app/api/health/route.ts` | Health/status endpoint. |
| `app/api/credits/route.ts` | Finds indexed batches by serial number and/or project ID. |
| `app/api/credits/[batchId]/route.ts` | Retrieves an indexed batch by its on-chain batch ID. |
| `app/api/credits/register/route.ts` | Validates a registered batch, checks for serial overlap, and saves it to MongoDB. |
| `app/api/credits/checkOverlap/route.ts` | Checks a project's proposed serial range against indexed batches. |
| `app/api/review/route.ts` | Performs basic rule-based checks on evidence text. |
| `lib/mongo.ts` | Opens and caches the MongoDB connection (`connectMongo`). |
| `lib/models/batch.ts` | Mongoose `Batch` model in the shared data format, plus `toCredit()`. |
| `lib/overlap.ts` | Validates serial ranges and checks inclusive range overlap (`findOverlap`, `rangesOverlap`, `hasOverlap`). |
| `lib/overlap.test.ts` | Unit tests for the overlap rule. |
| `lib/mockData.ts` | Older development-only sample batches. No API route uses it any more. |

## How the data fits together

- **The blockchain is the source of truth** for registration and retirement.
  MongoDB is only a fast search index and stores extra data such as `vintage`.
- The expected flow is: the website registers the batch on-chain
  (`web/lib/contract.ts`), then calls `POST /api/credits/register` with the
  resulting `txHash` and `batchId` so the batch can be searched quickly.
- Records use the shared data format: `projectId`, `vintage`, `startSerial`,
  `endSerial`, `evidenceHash`, `issuer`, `status`, `txHash`, `auditor`. The API
  also returns `batchId`, the on-chain batch ID (a number: 0, 1, 2...).
- `projectId` is compared **exactly** (case-sensitive, no trimming of stored
  values), matching the contract. `"kenya-001"` and `"KENYA-001"` are different
  projects.
- The same serial can exist in two different projects, so a serial lookup
  returns a list.

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

`timestamp` is generated when the request is handled.

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
`auditor` is the zero address until an approved auditor attests the batch.

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
saves nothing.

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

Validates a batch that has been registered on-chain, checks its serial range
against indexed batches for the same project, and saves it to MongoDB. It does
**not** submit a blockchain transaction itself; the caller must register on-chain
first and pass the resulting `txHash` and `batchId`.

Request:

```json
{
  "projectId": "KENYA-001",
  "vintage": 2025,
  "startSerial": 1000,
  "endSerial": 2000,
  "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "issuer": "0x1111111111111111111111111111111111111111",
  "batchId": 0
}
```

Thunder Client: **POST** `http://localhost:3000/api/credits/register` with the
JSON body above.

Successful registration (`201 Created`):

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

New batches are saved with `status: "issued"` and the zero address as `auditor`.

Validation requires a non-empty `projectId`; whole-number `vintage`,
`startSerial`, `endSerial` and `batchId` (>= 0); a `0x`-prefixed
64-hex-character `evidenceHash` and `txHash`; and a `0x`-prefixed
40-hex-character `issuer`. The serial range must satisfy
`0 <= startSerial <= endSerial`.

Errors:

- `400 Bad Request` for invalid JSON or invalid fields. Field problems return a
  list:

```json
{
  "error": "Invalid registration fields.",
  "problems": ["startSerial must be a whole number (not a string)"]
}
```

- `409 Conflict` when the serial range overlaps an indexed batch for the same
  project. The response includes `canRegister: false` and the `conflict` batch.
- `409 Conflict` (`"This batchId is already saved."`) when that `batchId` is
  already indexed. Sending the same request twice returns this.
- `500 Internal Server Error` for database problems.

### `POST /api/review`

Checks submitted evidence text for four simple indicators: a methodology/method
reference, monitoring/measurement details, verification/audit details, and a
four-digit year. It is rule-based, not an AI review. A result never approves
the project; human review is always required.

Request:

```json
{
  "projectId": "FOREST-DEMO-001",
  "evidenceText": "The methodology describes monitoring and measurement in 2025. An independent audit verified the results."
}
```

Thunder Client: **POST** `http://localhost:3000/api/review` with the JSON body
above.

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
is printed in the terminal running `npm run dev`. Common causes:

- `MONGODB_URI is not set`: add it to `web/.env.local` and restart `npm run dev`.
- Timeout or "IP not whitelisted": allow your IP in Atlas under Network Access.
- `bad auth`: wrong username or password in the URI. URL-encode symbols such as
  `@` in the password.
- Import errors about `@/lib/models/batch`: the file name and every import must
  use exactly the same capitalization.

## Limitations

- **MongoDB is an index, not the source of truth.** The register route trusts the
  `txHash` and `batchId` it is given and does not check them against the chain.
  Registration and retirement are only authoritative on-chain.
- `status` and `auditor` in MongoDB are set when a batch is saved and are not
  updated when credits are retired or an auditor attests. Pages that show
  retirement or attestation should read it from the contract.
- The contract retires one serial at a time, while `status` in MongoDB is stored
  per batch.
- Anyone can call `retire()` on the contract (no ownership check yet), and the
  on-chain overlap loop only scales to a prototype.
- `/api/review` uses keyword/year checks only. `approvalGranted` remains
  `false`, and `requiresHumanReview` remains `true`, even when no flags are
  found. It does not verify real-world carbon removal.
- All data is a prototype with synthetic data on a testnet.