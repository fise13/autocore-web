import "server-only";

import { MotorEntity } from "@/domain/motor";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminMotor } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type MotorDocument = {
  motor: MotorEntity;
  raw: Record<string, unknown>;
  /** Owning `users/{uid}` segment when the doc lives under a user motors subcollection. */
  ownerUid?: string;
};

function ownerUidFromPath(path: string): string | undefined {
  const match = path.match(/^users\/([^/]+)\/motors\//);
  return match?.[1];
}

function toMotorDocument(doc: {
  id: string;
  ref: { path: string };
  data: () => unknown;
}): MotorDocument | null {
  const raw = doc.data() as Record<string, unknown>;
  const motor = mapAdminMotor(doc.id, raw);
  if (!motor) return null;
  return { motor, raw, ownerUid: ownerUidFromPath(doc.ref.path) };
}

/**
 * Resolve a single motor by id.
 *
 * Motors live at `users/{uid}/motors/{localId}`, so a motor cannot be addressed
 * by path without already knowing which account created it. This used to be
 * answered by reading every motor in the company and scanning the result in
 * memory — meaning rendering one warranty PDF, or a warehouse worker scanning
 * one engine, read the entire fleet.
 *
 * `users/{uid}/motors/{localId}` uses the local id as the document id, so an
 * indexed `companyId + localId` lookup answers essentially every real call with
 * a single-document read. The exhaustive scan is kept only as a fallback for
 * records that predate that convention (legacy top-level `/motors`, or ids that
 * are not numeric), so behaviour is unchanged where the fast path misses.
 */
export async function fetchMotorDocumentById(
  companyId: string,
  motorId: string,
): Promise<MotorDocument | null> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const localId = Number(motorId);
  if (Number.isFinite(localId)) {
    const indexed = await db
      .collectionGroup("motors")
      .where("companyId", "==", normalizedCompanyId)
      .where("localId", "==", localId)
      .limit(1)
      .get();

    const doc = indexed.docs[0];
    if (doc) {
      const resolved = toMotorDocument(doc);
      if (resolved) return resolved;
    }
  }

  // Fallback: full scan. Only reached for ids the indexed lookup cannot express.
  const groupSnapshot = await db
    .collectionGroup("motors")
    .where("companyId", "==", normalizedCompanyId)
    .get();

  for (const doc of groupSnapshot.docs) {
    const resolved = toMotorDocument(doc);
    if (!resolved) continue;
    const { motor } = resolved;
    if (motor.id === motorId || doc.id === motorId || String(motor.localId) === motorId) {
      return resolved;
    }
  }

  return null;
}

export async function listMotorDocuments(
  companyId: string,
  status?: string,
): Promise<MotorDocument[]> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const groupSnapshot = await db
    .collectionGroup("motors")
    .where("companyId", "==", normalizedCompanyId)
    .get();

  const items: MotorDocument[] = [];
  for (const doc of groupSnapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const motor = mapAdminMotor(doc.id, raw);
    if (!motor) continue;
    if (motor.deletedAt) continue;
    if (status && motor.status !== status) continue;
    items.push({ motor, raw, ownerUid: ownerUidFromPath(doc.ref.path) });
  }

  items.sort((a, b) => {
    const aLocal = a.motor.localId ?? 0;
    const bLocal = b.motor.localId ?? 0;
    return bLocal - aLocal;
  });

  return items;
}

/** Read cap for interactive motor reads — see {@link listMotorDocumentsBounded}. */
export const MOTOR_READ_CAP = 400;

export type BoundedMotorDocuments = {
  items: MotorDocument[];
  /** True when the read cap was hit, so callers can say the view is partial. */
  truncated: boolean;
};

/**
 * Bounded variant of {@link listMotorDocuments} for interactive callers.
 *
 * `listMotorDocuments` scans the entire `motors` collection group with no
 * limit, which is acceptable for the once-per-page dashboard overview but a
 * real cost and latency hazard for a tool the assistant may call on every
 * question. Deliberately a separate function: changing the original would
 * silently truncate the dashboard.
 *
 * No `orderBy` — that would need a new COLLECTION_GROUP composite index, and
 * the existing `companyId`-only collection-group index already serves this.
 * Ordering stays in memory, matching the original.
 */
export async function listMotorDocumentsBounded(
  companyId: string,
  options?: { limit?: number; status?: string },
): Promise<BoundedMotorDocuments> {
  const cap = Math.max(1, Math.min(options?.limit ?? MOTOR_READ_CAP, MOTOR_READ_CAP));
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const groupSnapshot = await db
    .collectionGroup("motors")
    .where("companyId", "==", normalizedCompanyId)
    .limit(cap)
    .get();

  const items: MotorDocument[] = [];
  for (const doc of groupSnapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const motor = mapAdminMotor(doc.id, raw);
    if (!motor) continue;
    if (motor.deletedAt) continue;
    if (options?.status && motor.status !== options.status) continue;
    items.push({ motor, raw, ownerUid: ownerUidFromPath(doc.ref.path) });
  }

  items.sort((a, b) => (b.motor.localId ?? 0) - (a.motor.localId ?? 0));

  return { items, truncated: groupSnapshot.size >= cap };
}
