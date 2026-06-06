import { readFile } from "node:fs/promises";

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
  const remote = await fetchRemoteLogo(trimmed);
  return remote ?? undefined;
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
