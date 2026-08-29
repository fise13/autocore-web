export class VpicError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class VpicVinFormatError extends VpicError {
  readonly vin: string;

  constructor(vin: string, reason: string) {
    super(`Invalid VIN «${vin}»: ${reason}`);
    this.vin = vin;
  }
}

export class VpicHttpError extends VpicError {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string, bodyPreview?: string) {
    const suffix = bodyPreview ? ` — ${bodyPreview}` : "";
    super(`NHTSA vPIC HTTP ${status} for ${url}${suffix}`);
    this.status = status;
    this.url = url;
  }
}

export class VpicTimeoutError extends VpicError {
  readonly url: string;
  readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number, cause?: unknown) {
    super(`NHTSA vPIC timed out after ${timeoutMs}ms: ${url}`, { cause });
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export class VpicNetworkError extends VpicError {
  readonly url: string;

  constructor(url: string, cause: unknown) {
    super(`NHTSA vPIC network failure: ${url}`, { cause });
    this.url = url;
  }
}

export class VpicResponseError extends VpicError {}

export class VpicNhtsaError extends VpicError {
  readonly vin: string | null;
  readonly errorCode: string;
  readonly additionalErrorText: string | null;

  constructor(params: {
    vin?: string | null;
    errorCode: string;
    additionalErrorText?: string | null;
    message?: string;
  }) {
    const extra = params.additionalErrorText ? ` ${params.additionalErrorText}` : "";
    super(params.message ?? `NHTSA decode error ${params.errorCode}.${extra}`.trim());
    this.vin = params.vin ?? null;
    this.errorCode = params.errorCode;
    this.additionalErrorText = params.additionalErrorText ?? null;
  }
}
