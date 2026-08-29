/** NHTSA vPIC envelope shared by every JSON method. */
export type VpicEnvelope<T> = {
  Count: number;
  Message: string;
  SearchCriteria: string | null;
  Results: T[];
};

/**
 * Key vehicle fields from DecodeVinValuesExtended / DecodeVINValuesBatch.
 * All NHTSA values arrive as strings; this is the mapped, typed view.
 */
export type VinDecodeResult = {
  vin: string;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  bodyClass: string | null;
  engineCylinders: number | null;
  displacementL: number | null;
  errorCode: string;
  additionalErrorText: string | null;
  /** True when NHTSA reports any non-zero ErrorCode. */
  hasNhtsaError: boolean;
  errorCodes: string[];
  errorText: string | null;
};

export type VehicleMake = {
  makeId: number;
  makeName: string;
  vehicleTypeId: number | null;
  vehicleTypeName: string | null;
};

export type VehicleModel = {
  makeId: number;
  makeName: string;
  modelId: number;
  modelName: string;
};

export type BatchVinInput = {
  vin: string;
  /** Optional model year hint — NHTSA recommends it for pre-1980 / ambiguous VINs. */
  modelYear?: number;
};

export type VpicClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  retryBackoffMs?: number;
  userAgent?: string;
  fetch?: typeof globalThis.fetch;
};

export const VPIC_DEFAULT_BASE_URL = "https://vpic.nhtsa.dot.gov/api/";
export const VPIC_BATCH_MAX_VINS = 50;
export const VPIC_DEFAULT_TIMEOUT_MS = 15_000;
export const VPIC_DEFAULT_RETRIES = 2;
export const VPIC_DEFAULT_RETRY_BACKOFF_MS = 400;
