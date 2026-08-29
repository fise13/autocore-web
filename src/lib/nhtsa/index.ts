export {
  decodeVinBatch,
  decodeVinExtended,
  getMakes,
  getModels,
  getVpicClient,
  VpicClient,
} from "@/lib/nhtsa/client";
export {
  VpicError,
  VpicHttpError,
  VpicNetworkError,
  VpicNhtsaError,
  VpicResponseError,
  VpicTimeoutError,
  VpicVinFormatError,
} from "@/lib/nhtsa/errors";
export { assertCleanDecode } from "@/lib/nhtsa/map";
export type {
  BatchVinInput,
  VehicleMake,
  VehicleModel,
  VinDecodeResult,
  VpicClientOptions,
  VpicEnvelope,
} from "@/lib/nhtsa/types";
export {
  VPIC_BATCH_MAX_VINS,
  VPIC_DEFAULT_BASE_URL,
  VPIC_DEFAULT_RETRY_BACKOFF_MS,
  VPIC_DEFAULT_RETRIES,
  VPIC_DEFAULT_TIMEOUT_MS,
} from "@/lib/nhtsa/types";
export { assertValidVin, isValidVin, normalizeVin } from "@/lib/nhtsa/vin";
