import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { DocumentSlug, resolveDocumentSlug } from "@/lib/documents/document-types";
import { getAppUrl } from "@/lib/site-urls";

function resolveRenderBaseUrl(): string {
  const override = process.env.PDF_RENDER_BASE_URL?.trim();
  if (override) return override.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT?.trim() || "3000";
    return `http://127.0.0.1:${port}`;
  }

  return getAppUrl().replace(/\/$/, "");
}

function renderSecret(): string {
  const dedicated = process.env.DOCUMENT_RENDER_SECRET?.trim();
  if (dedicated) return dedicated;

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV);

  if (isProduction) {
    throw new Error(
      "DOCUMENT_RENDER_SECRET is required in production. Set a random string of at least 32 characters.",
    );
  }

  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineServiceAccount && !inlineServiceAccount.includes("...")) {
    return inlineServiceAccount;
  }

  const pathSecret = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (pathSecret) return pathSecret;

  return "autocore-document-render-dev";
}

type RenderTokenPayload = {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  expiresAt: number;
};

function encodePayload(payload: RenderTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): RenderTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as RenderTokenPayload;
    if (!parsed.companyId || !parsed.orderId || !parsed.slug || !parsed.expiresAt) return null;
    if (!resolveDocumentSlug(parsed.slug)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createDocumentRenderToken(params: {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  ttlMs?: number;
  theme?: string;
}): string {
  const payload: RenderTokenPayload & { theme?: string } = {
    companyId: params.companyId,
    orderId: params.orderId,
    slug: params.slug,
    aggregateType: params.aggregateType ?? "work_order",
    expiresAt: Date.now() + (params.ttlMs ?? 5 * 60 * 1000),
    ...(params.theme ? { theme: params.theme } : {}),
  };
  const encoded = encodePayload(payload);
  const signature = createHmac("sha256", renderSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function parseDocumentRenderToken(token: string): RenderTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = createHmac("sha256", renderSecret()).update(encoded).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  const payload = decodePayload(encoded);
  if (!payload || payload.expiresAt < Date.now()) return null;
  return payload;
}

export function verifyDocumentRenderToken(
  token: string,
  expected: { companyId: string; orderId: string; slug: DocumentSlug },
): boolean {
  const payload = parseDocumentRenderToken(token);
  if (!payload) return false;
  if (payload.companyId !== expected.companyId) return false;
  if (payload.orderId !== expected.orderId) return false;
  if (payload.slug !== expected.slug) return false;
  return true;
}

export function documentRenderUrl(params: {
  companyId: string;
  orderId: string;
  slug: DocumentSlug;
  aggregateType?: "work_order" | "warranty" | "quote";
  theme?: string;
}): string {
  const baseUrl = resolveRenderBaseUrl();
  const token = createDocumentRenderToken(params);
  const themeQuery = params.theme ? `&theme=${encodeURIComponent(params.theme)}` : "";
  const aggregateQuery =
    params.aggregateType && params.aggregateType !== "work_order"
      ? `&aggregate=${encodeURIComponent(params.aggregateType)}`
      : "";
  return `${baseUrl}/render/documents/${params.orderId}/${params.slug}?token=${encodeURIComponent(token)}${themeQuery}${aggregateQuery}`;
}
