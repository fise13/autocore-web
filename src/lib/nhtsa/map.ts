import { VpicNhtsaError, VpicResponseError } from "@/lib/nhtsa/errors";
import type { VehicleMake, VehicleModel, VinDecodeResult, VpicEnvelope } from "@/lib/nhtsa/types";

export function blankToNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function parseOptionalInt(value: unknown): number | null {
  const text = blankToNull(value);
  if (!text) return null;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalFloat(value: unknown): number | null {
  const text = blankToNull(value);
  if (!text) return null;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : null;
}

export function parseErrorCodes(errorCode: string): string[] {
  return errorCode
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** NHTSA uses `0` (and only `0`) for a clean decode. Multiple codes arrive as `"1,8"`. */
export function hasNonZeroErrorCode(errorCode: string): boolean {
  const codes = parseErrorCodes(errorCode);
  if (codes.length === 0) return false;
  return codes.some((code) => code !== "0");
}

export function parseEnvelope<T>(payload: unknown): VpicEnvelope<T> {
  if (!payload || typeof payload !== "object") {
    throw new VpicResponseError("NHTSA vPIC returned a non-object JSON body");
  }
  const record = payload as Record<string, unknown>;
  const results = record.Results;
  if (!Array.isArray(results)) {
    throw new VpicResponseError("NHTSA vPIC response is missing Results[]");
  }
  return {
    Count: typeof record.Count === "number" ? record.Count : results.length,
    Message: typeof record.Message === "string" ? record.Message : "",
    SearchCriteria: blankToNull(record.SearchCriteria),
    Results: results as T[],
  };
}

type RawDecodeRow = Record<string, unknown>;

export function mapVinDecode(row: unknown): VinDecodeResult {
  if (!row || typeof row !== "object") {
    throw new VpicResponseError("NHTSA vPIC decode row is not an object");
  }
  const raw = row as RawDecodeRow;
  const errorCode = blankToNull(raw.ErrorCode) ?? "";
  const additionalErrorText = blankToNull(raw.AdditionalErrorText);
  return {
    vin: blankToNull(raw.VIN) ?? "",
    make: blankToNull(raw.Make),
    model: blankToNull(raw.Model),
    modelYear: parseOptionalInt(raw.ModelYear),
    bodyClass: blankToNull(raw.BodyClass),
    engineCylinders: parseOptionalInt(raw.EngineCylinders),
    displacementL: parseOptionalFloat(raw.DisplacementL),
    errorCode,
    additionalErrorText,
    hasNhtsaError: hasNonZeroErrorCode(errorCode),
    errorCodes: parseErrorCodes(errorCode),
    errorText: blankToNull(raw.ErrorText),
  };
}

export function assertCleanDecode(result: VinDecodeResult): VinDecodeResult {
  if (!result.hasNhtsaError) return result;
  throw new VpicNhtsaError({
    vin: result.vin || null,
    errorCode: result.errorCode,
    additionalErrorText: result.additionalErrorText,
    message: result.errorText ?? undefined,
  });
}

export function mapVehicleMake(row: unknown): VehicleMake {
  if (!row || typeof row !== "object") {
    throw new VpicResponseError("NHTSA make row is not an object");
  }
  const raw = row as Record<string, unknown>;
  const makeName = blankToNull(raw.MakeName);
  const makeId = parseOptionalInt(raw.MakeId);
  if (!makeName || makeId == null) {
    throw new VpicResponseError("NHTSA make row is missing MakeId / MakeName");
  }
  return {
    makeId,
    makeName,
    vehicleTypeId: parseOptionalInt(raw.VehicleTypeId),
    vehicleTypeName: blankToNull(raw.VehicleTypeName),
  };
}

export function mapVehicleModel(row: unknown): VehicleModel {
  if (!row || typeof row !== "object") {
    throw new VpicResponseError("NHTSA model row is not an object");
  }
  const raw = row as Record<string, unknown>;
  const makeName = blankToNull(raw.Make_Name);
  const modelName = blankToNull(raw.Model_Name);
  const makeId = parseOptionalInt(raw.Make_ID);
  const modelId = parseOptionalInt(raw.Model_ID);
  if (!makeName || !modelName || makeId == null || modelId == null) {
    throw new VpicResponseError("NHTSA model row is missing Make_ID / Make_Name / Model_ID / Model_Name");
  }
  return { makeId, makeName, modelId, modelName };
}
