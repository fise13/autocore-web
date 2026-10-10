import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  buildLocationDisplayCode,
  locationLeafDocId,
  normalizeLocationCode,
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
  unlocatedLocationDocId,
} from "@/domain/warehouse-location";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { buildLocationEntityLink } from "@/lib/warehouse/location-entity-link";
import {
  inferLocationType,
  joinLocationPath,
  splitLocationPath,
} from "@/lib/warehouse/location-path";

export type EnsuredLocation = {
  id: string;
  displayCode: string;
  path: string[];
};

type CachedLocation = EnsuredLocation & {
  parentId: string | null;
  code: string;
};

/**
 * Resolve free-text (and nested paths) to a warehouseLocations leaf.
 *
 * One cache per import/commit so 3,000 engines going into twenty boxes do not
 * become 3,000 identical writes. Parents are created before children.
 */
export function createLocationPathEnsurer(params: {
  companyId: string;
  warehouseId: string;
  actorUserId: string;
}) {
  const companyId = normalizeCompanyId(params.companyId);
  const warehouseId = params.warehouseId;
  const actorUserId = params.actorUserId;
  const db = getAdminFirestore();
  const byDisplayCode = new Map<string, CachedLocation>();
  const byParentCode = new Map<string, CachedLocation>();
  const inflight = new Map<string, Promise<EnsuredLocation>>();
  let primed: Promise<void> | null = null;

  async function prime(): Promise<void> {
    if (primed) return primed;
    primed = (async () => {
      const snap = await db
        .collection("warehouseLocations")
        .where("companyId", "==", companyId)
        .where("warehouseId", "==", warehouseId)
        .where("isActive", "==", true)
        .get();
      for (const doc of snap.docs) {
        remember(mapDoc(doc.id, doc.data() as Record<string, unknown>));
      }
    })();
    return primed;
  }

  function remember(location: CachedLocation): void {
    byDisplayCode.set(location.displayCode, location);
    byParentCode.set(`${location.parentId ?? ""}:${fold(location.code)}`, location);
  }

  async function findByDisplayCode(displayCode: string): Promise<CachedLocation | null> {
    const cached = byDisplayCode.get(displayCode);
    if (cached) return cached;
    const snap = await db
      .collection("warehouseLocations")
      .where("companyId", "==", companyId)
      .where("warehouseId", "==", warehouseId)
      .where("displayCode", "==", displayCode)
      .get();
    const doc = snap.docs.find((item) => item.data().isActive !== false) ?? snap.docs[0];
    if (!doc) return null;
    const mapped = mapDoc(doc.id, doc.data() as Record<string, unknown>);
    remember(mapped);
    return mapped;
  }

  async function createNode(input: {
    parentId: string | null;
    code: string;
    path: string[];
    type: ReturnType<typeof inferLocationType>;
  }): Promise<CachedLocation> {
    const displayCode = buildLocationDisplayCode(input.path);
    const ref = db.collection("warehouseLocations").doc(locationLeafDocId(warehouseId, displayCode));
    await ref.set({
      companyId,
      warehouseId,
      parentId: input.parentId,
      type: input.type,
      code: input.code,
      path: input.path,
      displayCode,
      barcode: buildLocationEntityLink(ref.id),
      isSystem: false,
      isActive: true,
      sortOrder: 0,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const created: CachedLocation = {
      id: ref.id,
      displayCode,
      path: input.path,
      parentId: input.parentId,
      code: input.code,
    };
    remember(created);
    return created;
  }

  async function walk(segments: string[]): Promise<EnsuredLocation> {
    await prime();
    let parentId: string | null = null;
    const path: string[] = [];
    let current: CachedLocation | null = null;

    for (const [index, raw] of segments.entries()) {
      const code = normalizeLocationCode(raw);
      path.push(code);
      const displayCode = buildLocationDisplayCode(path);
      const fromParent = byParentCode.get(`${parentId ?? ""}:${fold(code)}`);
      current =
        fromParent ??
        byDisplayCode.get(displayCode) ??
        (await findByDisplayCode(displayCode));
      if (!current) {
        current = await createNode({
          parentId,
          code,
          path: [...path],
          type: inferLocationType(code, index, segments.length),
        });
      }
      parentId = current.id;
    }

    if (!current) {
      return ensureUnlocatedAdmin(companyId, warehouseId, actorUserId);
    }
    return { id: current.id, displayCode: current.displayCode, path: current.path };
  }

  async function ensure(rawCode: string | null | undefined): Promise<EnsuredLocation | null> {
    const trimmed = normalizeLocationCode(rawCode ?? "");
    if (!trimmed) return null;

    const key = fold(trimmed);
    const existing = inflight.get(key);
    if (existing) return existing;

    const run = (async () => {
      await prime();
      const segments = splitLocationPath(trimmed);
      if (segments.length === 0) return ensureUnlocatedAdmin(companyId, warehouseId, actorUserId);

      const legacy = await findByDisplayCode(trimmed);
      if (legacy) return { id: legacy.id, displayCode: legacy.displayCode, path: legacy.path };

      if (segments.length > 1) {
        const joined = joinLocationPath(segments);
        const alreadyNested = await findByDisplayCode(joined);
        if (alreadyNested) {
          return { id: alreadyNested.id, displayCode: alreadyNested.displayCode, path: alreadyNested.path };
        }
      }

      return walk(segments);
    })();

    inflight.set(key, run);
    try {
      return await run;
    } catch (error) {
      inflight.delete(key);
      throw error;
    }
  }

  return { ensure };
}

export async function ensureUnlocatedAdmin(
  companyId: string,
  warehouseId: string,
  actorUserId: string,
): Promise<EnsuredLocation> {
  const db = getAdminFirestore();
  const id = unlocatedLocationDocId(warehouseId);
  const ref = db.collection("warehouseLocations").doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data() as Record<string, unknown>;
    return {
      id,
      displayCode: String(data.displayCode ?? UNLOCATED_LOCATION_LABEL),
      path: Array.isArray(data.path) ? data.path.map(String) : [UNLOCATED_LOCATION_CODE],
    };
  }

  await ref.set(
    {
      companyId: normalizeCompanyId(companyId),
      warehouseId,
      parentId: null,
      type: "custom",
      code: UNLOCATED_LOCATION_CODE,
      path: [UNLOCATED_LOCATION_CODE],
      displayCode: UNLOCATED_LOCATION_LABEL,
      label: UNLOCATED_LOCATION_LABEL,
      barcode: buildLocationEntityLink(id),
      isSystem: true,
      isActive: true,
      sortOrder: -1,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { id, displayCode: UNLOCATED_LOCATION_LABEL, path: [UNLOCATED_LOCATION_CODE] };
}

function fold(value: string): string {
  return value.trim().toLowerCase();
}

function mapDoc(id: string, data: Record<string, unknown>): CachedLocation {
  const code = normalizeLocationCode(String(data.code ?? ""));
  const path = Array.isArray(data.path) ? data.path.map(String).filter(Boolean) : [code];
  return {
    id,
    displayCode:
      typeof data.displayCode === "string" && data.displayCode.trim()
        ? data.displayCode.trim()
        : buildLocationDisplayCode(path.length ? path : [code]),
    path,
    parentId: data.parentId == null || data.parentId === "" ? null : String(data.parentId),
    code,
  };
}
