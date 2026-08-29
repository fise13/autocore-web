# NHTSA vPIC client

TypeScript client for the free [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) API.
No API key. Uses `fetch` (Node 20+).

Base URL: `https://vpic.nhtsa.dot.gov/api/`

## Methods

| Method | HTTP | Path |
|---|---|---|
| `decodeVinExtended` | GET | `/vehicles/DecodeVinValuesExtended/{vin}?format=json` |
| `decodeVinBatch` | POST | `/vehicles/DecodeVINValuesBatch/` |
| `getMakes` | GET | `/vehicles/GetMakesForVehicleType/{type}?format=json` |
| `getModels` | GET | `/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json` |

Mapped fields: `Make`, `Model`, `ModelYear`, `BodyClass`, `EngineCylinders`, `DisplacementL`, `ErrorCode`, `AdditionalErrorText`.

## Run tests

From the repo root (no network — `fetch` is mocked):

```bash
node --import tsx --test src/lib/nhtsa/client.test.ts src/lib/nhtsa/vin.test.ts
```

Or pick them up with the rest of the suite:

```bash
npm test -- src/lib/nhtsa
```

## Run live examples

Needs outbound HTTPS to `vpic.nhtsa.dot.gov`.

```bash
npx tsx src/lib/nhtsa/examples.ts
```

## Call examples

```ts
import { VpicClient, VpicNhtsaError, VpicVinFormatError } from "@/lib/nhtsa";

const vpic = new VpicClient({ timeoutMs: 15_000, retries: 2 });

// 1. Decode VIN (Extended)
const car = await vpic.decodeVinExtended("1HGCM82633A004352");
// { make: "HONDA", model: "Accord", modelYear: 2003, bodyClass: "Coupe", ... }

// 2. Batch Decode VIN (max 50 per POST; larger lists are chunked)
const rows = await vpic.decodeVinBatch([
  "1HGCM82633A004352",
  { vin: "5YJSA3H10EFP00001", modelYear: 2014 },
]);

// 3. Get Makes
const makes = await vpic.getMakes("car");

// 4. Get Models
const models = await vpic.getModels("honda", 2015);
```

VIN must be 17 characters and must not contain `I`, `O`, or `Q`. Invalid input throws `VpicVinFormatError` before any HTTP call.

A non-zero NHTSA `ErrorCode` throws `VpicNhtsaError` unless you pass `{ requireClean: false }`. HTTP / timeout / network failures throw `VpicHttpError`, `VpicTimeoutError`, or `VpicNetworkError`.
