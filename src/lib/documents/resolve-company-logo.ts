import { readFile } from "node:fs/promises";

const LOGO_CACHE_TTL_MS = 10 * 60_000;
const LOGO_CACHE_MAX = 64;
const logoCache = new Map<string, { expiresAt: number; value: string | undefined }>();

async function fetchRemoteLogo(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function resolveCompanyLogoDataUri(logoUrl?: string): Promise<string | undefined> {
  if (!logoUrl?.trim()) return undefined;
  const trimmed = logoUrl.trim();
  if (trimmed.startsWith("data:")) return trimmed;

  const cached = logoCache.get(trimmed);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const remote = (await fetchRemoteLogo(trimmed)) ?? undefined;

  if (logoCache.size >= LOGO_CACHE_MAX) {
    const oldest = logoCache.keys().next().value;
    if (oldest) logoCache.delete(oldest);
  }
  logoCache.set(trimmed, { expiresAt: Date.now() + LOGO_CACHE_TTL_MS, value: remote });

  return remote;
}

/** @deprecated Documents no longer use a platform default logo. */
export async function readLocalLogoDataUri(filePath: string): Promise<string | null> {
  try {
    const buffer = await readFile(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
