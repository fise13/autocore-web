"use client";

import { getAuth } from "firebase/auth";

import type { ImportBatch, ImportBatchFile, ImportSuggestedRow } from "@/domain/import-batch";
import { getFirebaseApp } from "@/infrastructure/firebase/client";

async function authHeaders(): Promise<HeadersInit> {
  const auth = getAuth(getFirebaseApp());
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to your account");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function reviveBatch(raw: Record<string, unknown>): ImportBatch {
  return {
    ...(raw as unknown as ImportBatch),
    expiresAt: new Date(String(raw.expiresAt)),
    createdAt: new Date(String(raw.createdAt)),
    updatedAt: new Date(String(raw.updatedAt)),
  };
}

function reviveFile(raw: Record<string, unknown>): ImportBatchFile {
  return {
    ...(raw as unknown as ImportBatchFile),
    createdAt: new Date(String(raw.createdAt)),
    updatedAt: new Date(String(raw.updatedAt)),
  };
}

function reviveRow(raw: Record<string, unknown>): ImportSuggestedRow {
  return {
    ...(raw as unknown as ImportSuggestedRow),
    createdAt: new Date(String(raw.createdAt)),
    updatedAt: new Date(String(raw.updatedAt)),
  };
}

export async function fetchImportBatches(): Promise<ImportBatch[]> {
  const response = await fetch("/api/import-batches", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Не удалось загрузить импорты");
  }
  const data = (await response.json()) as { batches: Record<string, unknown>[] };
  return (data.batches ?? []).map(reviveBatch);
}

export async function createImportBatchClient(params?: {
  target?: "motors" | "warehouse" | "auto";
  title?: string;
}): Promise<ImportBatch> {
  const response = await fetch("/api/import-batches", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(params ?? {}),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Не удалось создать импорт");
  }
  const data = (await response.json()) as { batch: Record<string, unknown> };
  return reviveBatch(data.batch);
}

export async function fetchImportBatchDetail(batchId: string): Promise<{
  batch: ImportBatch;
  files: ImportBatchFile[];
  rows: ImportSuggestedRow[];
}> {
  const response = await fetch(`/api/import-batches/${batchId}?include=all`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Не удалось загрузить импорт");
  }
  const data = (await response.json()) as {
    batch: Record<string, unknown>;
    files: Record<string, unknown>[];
    rows: Record<string, unknown>[];
  };
  return {
    batch: reviveBatch(data.batch),
    files: (data.files ?? []).map(reviveFile),
    rows: (data.rows ?? []).map(reviveRow),
  };
}

export async function uploadImportBatchFileClient(params: {
  batchId: string;
  file: File;
}): Promise<{ batch: ImportBatch; file: ImportBatchFile }> {
  const auth = getAuth(getFirebaseApp());
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to your account");

  const form = new FormData();
  form.append("file", params.file);

  const response = await fetch(`/api/import-batches/${params.batchId}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Не удалось загрузить файл");
  }
  const data = (await response.json()) as {
    batch: Record<string, unknown>;
    file: Record<string, unknown>;
  };
  return {
    batch: reviveBatch(data.batch),
    file: reviveFile(data.file),
  };
}
