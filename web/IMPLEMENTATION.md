# Web Implementation

This document describes the current web API implementation, the files it uses,
and how to call each endpoint.

## Run the web application

From the repository root:

```bash
cd web
npm install
npm run dev
```

The development server is usually available at `http://localhost:3000`. Replace
that base URL with your deployed web application's URL when calling the API.
All request and response bodies described below use JSON.

## Implementation files

The current API implementation consists of:

| File | Purpose |
| --- | --- |
| `app/api/health/route.ts` | Health/status endpoint. |
| `app/api/credits/route.ts` | Searches mock credit batches by project ID. |
| `app/api/credits/[batchId]/route.ts` | Retrieves a mock batch by its batch ID. |
| `app/api/credits/register/route.ts` | Validates proposed credit registration data and checks for serial overlap. |
| `app/api/credits/checkOverlap/route.ts` | Checks a project's proposed serial range against mock batches. |
| `app/api/review/route.ts` | Performs basic rule-based checks on evidence text. |
| `lib/mockData.ts` | Defines the credit record types and development-only sample batches. |
| `lib/overlap.ts` | Validates serial ranges and checks inclusive range overlap. |

The endpoint handlers and mock data are currently development implementations.
They do not write to a database or submit blockchain transactions. The register
endpoint explicitly returns `persisted: false`; overlap checks and credit
lookups use only the in-memory sample data.

## API routes

### `GET /api/health`

Returns a JSON status response indicating the service is reachable.

Example:

```bash
curl http://localhost:3000/api/health
```

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

### `GET /api/credits?query=<projectId>`

Searches the sample credit batches. The optional `query` parameter is matched
case-insensitively as a substring of each batch's `projectId`. Omitting it (or
passing an empty value) returns all sample batches.

Examples:

```bash
curl "http://localhost:3000/api/credits"
curl "http://localhost:3000/api/credits?query=forest"
```

Response (`200 OK`):

```json
{
  "mode": "development",
  "count": 1,
  "credits": [
    {
      "batchId": "mock-1",
      "projectId": "FOREST-DEMO-001",
      "vintage": 2025,
      "startSerial": 1001,
      "endSerial": 1100,
      "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "issuer": "0x1111111111111111111111111111111111111111",
      "status": "issued",
      "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "auditor": ""
    }
  ]
}
```

The sample data currently contains `mock-1` (`FOREST-DEMO-001`) and `mock-2`
(`SOLAR-DEMO-002`). An unmatched query returns `200 OK` with `count: 0` and an
empty `credits` array.

### `GET /api/credits/{batchId}`

Retrieves one sample credit batch by its exact batch ID.

Example:

```bash
curl http://localhost:3000/api/credits/mock-1
```

Response (`200 OK`):

```json
{
  "mode": "development",
  "credit": {
    "batchId": "mock-1",
    "projectId": "FOREST-DEMO-001",
    "vintage": 2025,
    "startSerial": 1001,
    "endSerial": 1100,
    "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "issuer": "0x1111111111111111111111111111111111111111",
    "status": "issued",
    "txHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "auditor": ""
  }
}
```

If the batch ID is not present in the sample data, the endpoint returns `404
Not Found`:

```json
{
  "error": "Credit batch not found",
  "batchId": "unknown"
}
```

### `POST /api/credits/checkOverlap`

Checks whether a proposed inclusive serial range overlaps a sample batch for
the specified project. The `projectId` comparison is case-insensitive.

Request:

```json
{
  "projectId": "FOREST-DEMO-001",
  "startSerial": 1100,
  "endSerial": 1200
}
```

Example:

```bash
curl -X POST http://localhost:3000/api/credits/checkOverlap \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"FOREST-DEMO-001\",\"startSerial\":1100,\"endSerial\":1200}"
```

Response when the range overlaps (`200 OK`):

```json
{
  "mode": "development",
  "projectId": "FOREST-DEMO-001",
  "startSerial": 1100,
  "endSerial": 1200,
  "overlap": true,
  "canRegister": false,
  "message": "This serial range overlaps an existing batch."
}
```

When no overlap is found, `overlap` is `false`, `canRegister` is `true`, and
the message says no overlap was found in the current mock data. Ranges are
inclusive, so sharing an endpoint serial counts as an overlap.

Errors:

- `400 Bad Request` if JSON is invalid, a field is missing/invalid, or the
  range is negative or has `startSerial > endSerial`.
- Invalid JSON returns `{"error":"Invalid JSON request body."}`. Invalid fields
  and ranges return a descriptive `error` string.

### `POST /api/credits/register`

Validates a proposed batch and checks its serial range against the sample
batches for the same project. This is a simulation only: it does not persist
the batch or submit a blockchain transaction.

Request:

```json
{
  "projectId": "NEW-PROJECT-001",
  "vintage": 2026,
  "startSerial": 1,
  "endSerial": 100,
  "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "issuer": "0x1111111111111111111111111111111111111111"
}
```

Example:

```bash
curl -X POST http://localhost:3000/api/credits/register \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"NEW-PROJECT-001\",\"vintage\":2026,\"startSerial\":1,\"endSerial\":100,\"evidenceHash\":\"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"issuer\":\"0x1111111111111111111111111111111111111111\"}"
```

Successful validation (`200 OK`):

```json
{
  "mode": "development",
  "simulated": true,
  "persisted": false,
  "proposedBatch": {
    "projectId": "NEW-PROJECT-001",
    "vintage": 2026,
    "startSerial": 1,
    "endSerial": 100,
    "evidenceHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "issuer": "0x1111111111111111111111111111111111111111"
  },
  "transaction": {
    "submitted": false,
    "batchId": null,
    "txHash": null
  },
  "message": "Validation passed. Real registration requires database and smart-contract integration."
}
```

Validation requires a non-empty `projectId`, safe-integer `vintage`,
`startSerial`, and `endSerial`, a `0x`-prefixed 64-hex-character
`evidenceHash`, and a `0x`-prefixed 40-hex-character `issuer`. The serial range
must be non-negative with `startSerial <= endSerial`.

Errors:

- `400 Bad Request` for invalid JSON, missing/invalid fields, or an invalid
  serial range.
- `409 Conflict` when the serial range overlaps an existing sample batch for
  that project. The response includes `canRegister: false`.

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

Example:

```bash
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"FOREST-DEMO-001\",\"evidenceText\":\"The methodology describes monitoring and measurement in 2025. An independent audit verified the results.\"}"
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

## Development limitations

- All routes return development/mock behavior; there is no persistence,
  on-chain transaction, or production carbon-credit verification in these
  handlers.
- `/api/credits` and `/api/credits/{batchId}` read only `mockCredits`.
- Overlap checks use the current mock data and apply only to batches whose
  project ID matches the submitted project ID.
- `/api/review` uses keyword/year checks only. `approvalGranted` remains
  `false`, and `requiresHumanReview` remains `true`, even when no flags are
  found.
