/**
 * Photo matching.
 *
 * When a ZIP carries images next to the spreadsheet, link each photo to its row
 * by (in priority order) serial number, SKU, name, or the value of a photo
 * column. Supports `C123456_1.jpg` / `C123456-2.jpg` grouping so one record can
 * own several photos.
 */

import { fold } from "@/lib/domain/normalize";

import type { ImageAsset } from "./ingestion/types";
import type { ClassifiedRow } from "./types";

export type PhotoMatchBy = "serial" | "sku" | "name" | "filename";

export type PhotoMatch = {
  rowIndex: number;
  images: ImageAsset[];
  matchedBy: PhotoMatchBy;
  /** 0–1 — exact key match is 1, contains match is lower. */
  confidence: number;
};

/** Derive extra match keys from photo filenames like `EJ205_SN100001.jpg`. */
function filenameMatchKeys(fileName: string): string[] {
  const stem = fileName.replace(/\.[a-z0-9]+$/i, "");
  const keys = new Set<string>();
  for (const part of stem.split(/[_\-\s]+/)) {
    const folded = fold(part);
    if (folded.length >= 3) keys.add(folded);
  }
  return [...keys];
}

/** Strip trailing `_1` / `-02` / ` (3)` photo-sequence suffixes from a key. */
function baseKey(key: string): string {
  return key.replace(/[\s_-]*\(?\d{1,3}\)?$/, "") || key;
}

/** Significant tokens from a product name (`GC8`, `Camry40`, `EJ205`). */
function nameTokens(name: string): string[] {
  return name
    .split(/[\s_\-./]+/)
    .map((part) => fold(part))
    .filter((token) => token.length >= 3 && (/[a-z]/.test(token) || /\d/.test(token)));
}

type RowKey = { row: ClassifiedRow; by: PhotoMatchBy; key: string };

export function matchPhotos(rows: ClassifiedRow[], images: ImageAsset[]): PhotoMatch[] {
  if (images.length === 0 || rows.length === 0) return [];

  // Build candidate keys per row, strongest signal first.
  const rowKeys: RowKey[] = [];
  for (const row of rows) {
    const { serial, sku, name, photo } = row.values;
    if (serial) rowKeys.push({ row, by: "serial", key: fold(serial) });
    if (sku) rowKeys.push({ row, by: "sku", key: fold(sku) });
    if (photo) rowKeys.push({ row, by: "filename", key: fold(photo.replace(/\.[a-z0-9]+$/i, "")) });
    if (name) {
      rowKeys.push({ row, by: "name", key: fold(name) });
      for (const token of nameTokens(name)) {
        rowKeys.push({ row, by: "name", key: token });
      }
    }
  }

  const priority: Record<PhotoMatchBy, number> = { serial: 4, filename: 3, sku: 2, name: 1 };
  const assigned = new Map<number, { match: PhotoMatch; priority: number }>();

  for (const image of images) {
    const imageKey = image.matchKey;
    const imageBase = baseKey(imageKey);
    const imageKeys = [imageKey, imageBase, ...filenameMatchKeys(image.fileName)];
    if (!imageKey) continue;

    let best: { rowKey: RowKey; confidence: number } | null = null;
    for (const rowKey of rowKeys) {
      if (!rowKey.key) continue;
      let confidence = 0;
      for (const candidateKey of imageKeys) {
        if (!candidateKey) continue;
        if (candidateKey === rowKey.key) {
          confidence = Math.max(confidence, 1);
        } else if (rowKey.key.length >= 4 && candidateKey.includes(rowKey.key)) {
          confidence = Math.max(confidence, 0.85);
        } else if (rowKey.key.length >= 4 && rowKey.key.includes(candidateKey) && candidateKey.length >= 4) {
          confidence = Math.max(confidence, 0.75);
        }
      }
      if (confidence === 0) continue;

      const score = confidence + priority[rowKey.by] * 0.001;
      if (!best || score > best.confidence + priority[best.rowKey.by] * 0.001) {
        best = { rowKey, confidence };
      }
    }

    if (!best) continue;
    const index = best.rowKey.row.index;
    const existing = assigned.get(index);
    const candidate: PhotoMatch = {
      rowIndex: index,
      images: [...(existing?.match.images ?? []), image],
      matchedBy: best.rowKey.by,
      confidence: best.confidence,
    };
    const candidatePriority = priority[best.rowKey.by];
    if (!existing || candidatePriority >= existing.priority) {
      assigned.set(index, { match: candidate, priority: candidatePriority });
    }
  }

  return [...assigned.values()]
    .map((entry) => entry.match)
    .sort((a, b) => a.rowIndex - b.rowIndex);
}
