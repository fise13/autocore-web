import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VpicClient } from "@/lib/nhtsa/client";
import {
  VpicHttpError,
  VpicNetworkError,
  VpicNhtsaError,
  VpicTimeoutError,
  VpicVinFormatError,
} from "@/lib/nhtsa/errors";

const HONDA_VIN = "1HGCM82633A004352";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function decodeRow(overrides: Record<string, string> = {}) {
  return {
    VIN: HONDA_VIN,
    Make: "HONDA",
    Model: "Accord",
    ModelYear: "2003",
    BodyClass: "Coupe",
    EngineCylinders: "6",
    DisplacementL: "2.998832712",
    ErrorCode: "0",
    ErrorText: "0 - VIN decoded clean. Check Digit (9th position) is correct",
    AdditionalErrorText: "",
    ...overrides,
  };
}

describe("VpicClient.decodeVinExtended", () => {
  it("maps key fields from DecodeVinValuesExtended", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async (input) => {
        const url = String(input);
        assert.match(url, /DecodeVinValuesExtended\/1HGCM82633A004352\?format=json/);
        return jsonResponse({
          Count: 1,
          Message: "ok",
          SearchCriteria: `VIN(s): ${HONDA_VIN}`,
          Results: [decodeRow()],
        });
      },
    });

    const result = await client.decodeVinExtended(HONDA_VIN.toLowerCase());
    assert.equal(result.vin, HONDA_VIN);
    assert.equal(result.make, "HONDA");
    assert.equal(result.model, "Accord");
    assert.equal(result.modelYear, 2003);
    assert.equal(result.bodyClass, "Coupe");
    assert.equal(result.engineCylinders, 6);
    assert.equal(result.displacementL, 2.998832712);
    assert.equal(result.errorCode, "0");
    assert.equal(result.hasNhtsaError, false);
    assert.equal(result.additionalErrorText, null);
  });

  it("rejects an illegal VIN before calling fetch", async () => {
    let called = false;
    const client = new VpicClient({
      fetch: async () => {
        called = true;
        return jsonResponse({});
      },
    });
    await assert.rejects(() => client.decodeVinExtended("1HGCM8263IA004352"), VpicVinFormatError);
    assert.equal(called, false);
  });

  it("throws VpicNhtsaError when ErrorCode is non-zero", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async () =>
        jsonResponse({
          Count: 1,
          Message: "ok",
          SearchCriteria: "",
          Results: [
            decodeRow({
              ErrorCode: "1,8",
              ErrorText: "1 - Check Digit; 8 - No detailed data",
              AdditionalErrorText: "Manufacturer is not registered",
              Make: "",
              Model: "",
            }),
          ],
        }),
    });
    await assert.rejects(() => client.decodeVinExtended(HONDA_VIN), (error: unknown) => {
      assert.ok(error instanceof VpicNhtsaError);
      assert.equal(error.errorCode, "1,8");
      assert.equal(error.additionalErrorText, "Manufacturer is not registered");
      return true;
    });
  });

  it("returns the row when requireClean is false", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async () =>
        jsonResponse({
          Count: 1,
          Message: "ok",
          SearchCriteria: "",
          Results: [decodeRow({ ErrorCode: "8", AdditionalErrorText: "note" })],
        }),
    });
    const result = await client.decodeVinExtended(HONDA_VIN, { requireClean: false });
    assert.equal(result.hasNhtsaError, true);
    assert.deepEqual(result.errorCodes, ["8"]);
    assert.equal(result.additionalErrorText, "note");
  });
});

describe("VpicClient.decodeVinBatch", () => {
  it("POSTs form-encoded DATA and maps each result", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async (input, init) => {
        assert.equal(init?.method, "POST");
        assert.match(String(input), /DecodeVINValuesBatch\/$/);
        const body = init?.body;
        assert.ok(body instanceof URLSearchParams);
        assert.equal(body.get("format"), "json");
        assert.equal(body.get("DATA"), `${HONDA_VIN};JH4KA7561PC008269,1993`);
        return jsonResponse({
          Count: 2,
          Message: "ok",
          SearchCriteria: "",
          Results: [decodeRow(), decodeRow({ VIN: "JH4KA7561PC008269", Make: "ACURA", Model: "Legend" })],
        });
      },
    });

    const rows = await client.decodeVinBatch([
      HONDA_VIN,
      { vin: "JH4KA7561PC008269", modelYear: 1993 },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.make, "ACURA");
  });
});

describe("VpicClient.getMakes / getModels", () => {
  it("maps GetMakesForVehicleType", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async (input) => {
        assert.match(String(input), /GetMakesForVehicleType\/car\?format=json/);
        return jsonResponse({
          Count: 1,
          Message: "ok",
          SearchCriteria: "",
          Results: [{ MakeId: 474, MakeName: "HONDA", VehicleTypeId: 2, VehicleTypeName: "Passenger Car" }],
        });
      },
    });
    const makes = await client.getMakes();
    assert.deepEqual(makes, [
      { makeId: 474, makeName: "HONDA", vehicleTypeId: 2, vehicleTypeName: "Passenger Car" },
    ]);
  });

  it("maps GetModelsForMakeYear", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async (input) => {
        assert.match(String(input), /GetModelsForMakeYear\/make\/honda\/modelyear\/2015\?format=json/);
        return jsonResponse({
          Count: 1,
          Message: "ok",
          SearchCriteria: "",
          Results: [{ Make_ID: 474, Make_Name: "HONDA", Model_ID: 1861, Model_Name: "Accord" }],
        });
      },
    });
    const models = await client.getModels("honda", 2015);
    assert.deepEqual(models, [{ makeId: 474, makeName: "HONDA", modelId: 1861, modelName: "Accord" }]);
  });
});

describe("VpicClient reliability", () => {
  it("retries a 503 then succeeds", async () => {
    let calls = 0;
    const client = new VpicClient({
      retries: 2,
      retryBackoffMs: 1,
      fetch: async () => {
        calls += 1;
        if (calls === 1) return new Response("busy", { status: 503 });
        return jsonResponse({
          Count: 1,
          Message: "ok",
          SearchCriteria: "",
          Results: [decodeRow()],
        });
      },
    });
    const result = await client.decodeVinExtended(HONDA_VIN);
    assert.equal(result.make, "HONDA");
    assert.equal(calls, 2);
  });

  it("throws VpicHttpError after retries are exhausted", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async () => new Response("nope", { status: 502 }),
    });
    await assert.rejects(() => client.decodeVinExtended(HONDA_VIN), VpicHttpError);
  });

  it("throws VpicTimeoutError on abort", async () => {
    const client = new VpicClient({
      retries: 0,
      timeoutMs: 5,
      fetch: async (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });
    await assert.rejects(() => client.decodeVinExtended(HONDA_VIN), VpicTimeoutError);
  });

  it("throws VpicNetworkError on a connection failure", async () => {
    const client = new VpicClient({
      retries: 0,
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await assert.rejects(() => client.decodeVinExtended(HONDA_VIN), VpicNetworkError);
  });
});
