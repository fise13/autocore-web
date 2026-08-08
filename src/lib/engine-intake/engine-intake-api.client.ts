"use client";

import type {
  EngineIntakeCommand,
  EngineIntakeCommandResult,
} from "@autocore/engine-intake";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export function engineIntakeCommandId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function sendEngineIntakeCommand(
  companyId: string,
  command: EngineIntakeCommand,
): Promise<EngineIntakeCommandResult> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to continue");

  const response = await fetch("/api/engine-intake/commands", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Company-Id": companyId,
    },
    body: JSON.stringify(command),
  });
  const payload = (await response.json().catch(() => null)) as
    | (EngineIntakeCommandResult & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Engine intake command failed (HTTP ${response.status})`);
  }
  if (!payload?.ok) throw new Error("Engine intake command returned no result");
  return payload;
}

export async function matchEngineIntakePhotos(
  companyId: string,
  jobId: string,
  options?: { force?: boolean },
): Promise<{ ok: true; queued: number; matched: number; failed: number; photoIds: string[] }> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to continue");

  const response = await fetch("/api/engine-intake/ai/match", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Company-Id": companyId,
    },
    body: JSON.stringify({
      jobId,
      force: options?.force ?? false,
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    queued?: number;
    matched?: number;
    failed?: number;
    photoIds?: string[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `AI match failed (HTTP ${response.status})`);
  }
  return {
    ok: true,
    queued: payload?.queued ?? 0,
    matched: payload?.matched ?? 0,
    failed: payload?.failed ?? 0,
    photoIds: payload?.photoIds ?? [],
  };
}

export async function setEngineIntakePhotoCategory(
  companyId: string,
  input: {
    jobId: string;
    photoId: string;
    category: string;
    aiLabel?: string | null;
  },
): Promise<{ ok: true; photoId: string; category: string }> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to continue");

  const response = await fetch("/api/engine-intake/photos/category", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Company-Id": companyId,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    photoId?: string;
    category?: string;
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Category update failed (HTTP ${response.status})`);
  }
  return {
    ok: true,
    photoId: payload?.photoId ?? input.photoId,
    category: payload?.category ?? input.category,
  };
}
