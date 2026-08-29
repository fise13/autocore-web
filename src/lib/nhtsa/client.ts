import { VpicHttpError, VpicNetworkError, VpicResponseError, VpicTimeoutError } from "@/lib/nhtsa/errors";
import { assertCleanDecode, mapVehicleMake, mapVehicleModel, mapVinDecode, parseEnvelope } from "@/lib/nhtsa/map";
import type {
  BatchVinInput,
  VehicleMake,
  VehicleModel,
  VinDecodeResult,
  VpicClientOptions,
} from "@/lib/nhtsa/types";
import {
  VPIC_BATCH_MAX_VINS,
  VPIC_DEFAULT_BASE_URL,
  VPIC_DEFAULT_RETRIES,
  VPIC_DEFAULT_RETRY_BACKOFF_MS,
  VPIC_DEFAULT_TIMEOUT_MS,
} from "@/lib/nhtsa/types";
import { assertValidVin, normalizeVin } from "@/lib/nhtsa/vin";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function previewBody(text: string, max = 180): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

export class VpicClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly retries: number;
  readonly retryBackoffMs: number;
  readonly userAgent: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: VpicClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? VPIC_DEFAULT_BASE_URL).replace(/\/+$/, "") + "/";
    this.timeoutMs = options.timeoutMs ?? VPIC_DEFAULT_TIMEOUT_MS;
    this.retries = options.retries ?? VPIC_DEFAULT_RETRIES;
    this.retryBackoffMs = options.retryBackoffMs ?? VPIC_DEFAULT_RETRY_BACKOFF_MS;
    this.userAgent = options.userAgent ?? "AutoCore/1.0 (+https://myautocore.com)";
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Decode a 17-character VIN via DecodeVinValuesExtended.
   * Returns mapped fields even when NHTSA sets a non-zero ErrorCode; use
   * `{ requireClean: true }` (default) to throw `VpicNhtsaError` in that case.
   */
  async decodeVinExtended(
    vin: string,
    options: { modelYear?: number; requireClean?: boolean } = {},
  ): Promise<VinDecodeResult> {
    const normalized = assertValidVin(vin);
    const params = new URLSearchParams({ format: "json" });
    if (options.modelYear != null) params.set("modelyear", String(options.modelYear));

    const payload = await this.requestJson<unknown>(
      `vehicles/DecodeVinValuesExtended/${encodeURIComponent(normalized)}?${params}`,
    );
    const envelope = parseEnvelope<unknown>(payload);
    const row = envelope.Results[0];
    if (!row) {
      throw new VpicResponseError(`NHTSA returned no decode row for VIN ${normalized}`);
    }
    const result = mapVinDecode(row);
    if (!result.vin) result.vin = normalized;
    if (options.requireClean !== false) assertCleanDecode(result);
    return result;
  }

  /**
   * Batch-decode up to 50 VINs per POST (`DecodeVINValuesBatch`).
   * Larger lists are split automatically. Each VIN is validated first.
   */
  async decodeVinBatch(
    vins: Array<string | BatchVinInput>,
    options: { requireClean?: boolean } = {},
  ): Promise<VinDecodeResult[]> {
    if (vins.length === 0) return [];

    const items = vins.map((entry) => {
      if (typeof entry === "string") return { vin: assertValidVin(entry) };
      return {
        vin: assertValidVin(entry.vin),
        modelYear: entry.modelYear,
      };
    });

    const decoded: VinDecodeResult[] = [];
    for (let i = 0; i < items.length; i += VPIC_BATCH_MAX_VINS) {
      const chunk = items.slice(i, i + VPIC_BATCH_MAX_VINS);
      const data = chunk
        .map((item) => (item.modelYear != null ? `${item.vin},${item.modelYear}` : item.vin))
        .join(";");

      const body = new URLSearchParams({ DATA: data, format: "json" });
      const payload = await this.requestJson<unknown>("vehicles/DecodeVINValuesBatch/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const envelope = parseEnvelope<unknown>(payload);
      if (envelope.Results.length === 0) {
        throw new VpicResponseError("NHTSA batch decode returned no Results");
      }
      for (const row of envelope.Results) {
        const result = mapVinDecode(row);
        if (options.requireClean !== false) assertCleanDecode(result);
        decoded.push(result);
      }
    }
    return decoded;
  }

  /** Makes registered for a vehicle type. Default type is `car`. */
  async getMakes(vehicleType = "car"): Promise<VehicleMake[]> {
    const type = vehicleType.trim();
    if (!type) throw new VpicResponseError("vehicleType is required");
    const payload = await this.requestJson<unknown>(
      `vehicles/GetMakesForVehicleType/${encodeURIComponent(type)}?format=json`,
    );
    return parseEnvelope<unknown>(payload).Results.map(mapVehicleMake);
  }

  /** Models for a make + model year (`GetModelsForMakeYear`). Year must be ≥ 1995. */
  async getModels(make: string, year: number): Promise<VehicleModel[]> {
    const trimmed = make.trim();
    if (!trimmed) throw new VpicResponseError("make is required");
    if (!Number.isInteger(year) || year < 1995 || year > 2100) {
      throw new VpicResponseError(`model year must be an integer ≥ 1995, got ${year}`);
    }
    const path =
      `vehicles/GetModelsForMakeYear/make/${encodeURIComponent(trimmed)}` +
      `/modelyear/${encodeURIComponent(String(year))}?format=json`;
    const payload = await this.requestJson<unknown>(path);
    return parseEnvelope<unknown>(payload).Results.map(mapVehicleModel);
  }

  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path.replace(/^\/+/, ""), this.baseUrl).toString();
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, {
          ...init,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": this.userAgent,
            ...init.headers,
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const error = new VpicHttpError(response.status, url, previewBody(text));
          if (attempt < this.retries && RETRYABLE_STATUS.has(response.status)) {
            lastError = error;
            await sleep(this.retryBackoffMs * 2 ** attempt);
            continue;
          }
          throw error;
        }

        try {
          return (await response.json()) as T;
        } catch (cause) {
          throw new VpicResponseError("NHTSA vPIC returned invalid JSON", { cause });
        }
      } catch (error) {
        if (error instanceof VpicHttpError || error instanceof VpicResponseError) throw error;
        if (isAbortError(error)) {
          const timeout = new VpicTimeoutError(url, this.timeoutMs, error);
          if (attempt < this.retries) {
            lastError = timeout;
            await sleep(this.retryBackoffMs * 2 ** attempt);
            continue;
          }
          throw timeout;
        }
        const network = new VpicNetworkError(url, error);
        if (attempt < this.retries) {
          lastError = network;
          await sleep(this.retryBackoffMs * 2 ** attempt);
          continue;
        }
        throw network;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new VpicNetworkError(url, lastError);
  }
}

let defaultClient: VpicClient | null = null;

export function getVpicClient(options?: VpicClientOptions): VpicClient {
  if (options) return new VpicClient(options);
  defaultClient ??= new VpicClient();
  return defaultClient;
}

export function decodeVinExtended(
  vin: string,
  options?: { modelYear?: number; requireClean?: boolean },
): Promise<VinDecodeResult> {
  return getVpicClient().decodeVinExtended(vin, options);
}

export function decodeVinBatch(
  vins: Array<string | BatchVinInput>,
  options?: { requireClean?: boolean },
): Promise<VinDecodeResult[]> {
  return getVpicClient().decodeVinBatch(vins, options);
}

export function getMakes(vehicleType?: string): Promise<VehicleMake[]> {
  return getVpicClient().getMakes(vehicleType);
}

export function getModels(make: string, year: number): Promise<VehicleModel[]> {
  return getVpicClient().getModels(make, year);
}

export { normalizeVin };
