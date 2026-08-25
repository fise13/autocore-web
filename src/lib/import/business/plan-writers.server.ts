import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { UpsertInventoryItemInput } from "@/domain/inventory";
import type { MotorEntity } from "@/domain/motor";
import { upsertInventoryItemSchema, upsertMotorSchema } from "@/domain/schemas";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { persistDonorAdmin } from "@/infrastructure/firestore/admin/donor-admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeInventoryTaxonomyInput } from "@/lib/warehouse/inventory-taxonomy-normalize";
import { buildInventorySearchTokens } from "@/lib/warehouse/warehouse-search";

import {
  buildDonorInputFromMigrationRow,
  buildInventoryInputFromMigrationRow,
  buildMotorInputFromMigrationRow,
} from "../migration-row-builders";
import type { RecordType } from "../types";
import type { PlanWriters } from "./commit-plan";
import { foldKey } from "./entity-resolution";
import type { ExistingIndex } from "./import-plan";

/**
 * The only code in the import that touches the database.
 *
 * Everything above it — discovery, the model, resolution, the plan — decides;
 * this does. It deliberately owns no judgement: it is handed an entity and a
 * verb, and its whole job is to turn those into a document using the same
 * builders, schemas and collections the previous importer used. Reusing them
 * is what keeps the existing security rules, taxonomy normalization and search
 * tokens correct without re-deriving any of it.
 *
 * `companyId` and `uid` are captured here from the verified request, never read
 * off the plan. A stored plan is still an input, and this is the field that
 * decides whose database is written to.
 */

const INVENTORY_RECORD_TYPE: Record<string, RecordType> = {
  usedPart: "body",
  stockItem: "transmission",
};

async function loadMotors(uid: string): Promise<MotorEntity[]> {
  const snapshot = await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection("motors")
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      companyId: String(data.companyId ?? ""),
      localId: Number(data.localId ?? doc.id),
      serialCode: String(data.serialCode ?? ""),
      configuration: String(data.configuration ?? ""),
      notes: String(data.notes ?? ""),
      quantity: Number(data.quantity ?? 1),
      transmission: String(data.transmission ?? ""),
      arrivalDate: null,
    } satisfies MotorEntity;
  });
}

/**
 * Local ids are negative and derived from the clock, matching what the web
 * motor importer already does — the mobile app owns the positive range.
 */
function nextLocalId(used: Set<number>): number {
  let candidate = -Math.floor(Date.now() % 2_000_000_000);
  while (used.has(candidate)) candidate -= 1;
  used.add(candidate);
  return candidate;
}

export type AdminPlanWritersContext = {
  companyId: string;
  uid: string;
  warehouseId: string;
};

export async function createAdminPlanWriters(
  context: AdminPlanWritersContext,
): Promise<PlanWriters> {
  const db = getAdminFirestore();
  const companyId = normalizeCompanyId(context.companyId);
  const motors = await loadMotors(context.uid);
  const usedLocalIds = new Set(
    motors.map((motor) => motor.localId ?? Number(motor.id)).filter(Number.isFinite),
  );

  async function writeMotor(
    values: Record<string, string | undefined>,
    localId: number,
    options: { existing?: boolean } = {},
  ): Promise<string> {
    const input = buildMotorInputFromMigrationRow(values, companyId);
    if (!input) throw new Error("Двигатель без опознавательных данных");
    const validated = upsertMotorSchema.parse({
      ...input,
      companyId,
    });

    const payload: Record<string, unknown> = {
      companyId,
      localId,
      serialCode: validated.serialCode,
      configuration: validated.configuration ?? "",
      notes: validated.notes ?? "",
      quantity: validated.quantity ?? 1,
      transmission: validated.transmission ?? "",
      brandName: validated.brandName ?? "Не указан",
      engineCode: validated.engineCode ?? "—",
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Written only when the sheet actually carried the date. A merge with
    // `null` would erase a date the record already has, and a second import of
    // a partly-filled file would quietly strip the first one.
    if (validated.arrivalDate) payload.arrivalDate = validated.arrivalDate;
    if (validated.soldDate) payload.soldDate = validated.soldDate;

    if (validated.status === "sold") {
      payload.status = "sold";
    } else if (!options.existing) {
      // Only a new record gets its status from the import. Re-importing a book
      // that no longer lists a motor as sold must not put it back on the shelf
      // — the warehouse knows more about that record than the spreadsheet.
      payload.status = "available";
    }

    await db
      .collection("users")
      .doc(context.uid)
      .collection("motors")
      .doc(String(localId))
      .set(payload, { merge: true });
    return String(localId);
  }

  async function writeInventoryItem(
    values: Record<string, string | undefined>,
    kind: string,
    entityId: string,
    itemId?: string,
  ): Promise<string> {
    const recordType = INVENTORY_RECORD_TYPE[kind] ?? "body";
    const input = buildInventoryInputFromMigrationRow(
      values,
      companyId,
      recordType,
      entityId,
      context.uid,
    );
    if (!input) throw new Error("Позиция без названия");

    const normalized = normalizeInventoryTaxonomyInput(input);
    const parsed = upsertInventoryItemSchema.parse(normalized);
    const payload: Record<string, unknown> = {
      companyId,
      type: parsed.type ?? "generic",
      sku: parsed.sku.trim(),
      name: parsed.name.trim(),
      barcodes: parsed.barcodes ?? [],
      unit: parsed.unit ?? "pcs",
      currency: parsed.currency ?? "USD",
      status: parsed.status ?? "active",
      inventoryGroup: normalized.inventoryGroup ?? parsed.inventoryGroup ?? "parts",
      searchTokens: buildInventorySearchTokens(parsed as UpsertInventoryItemInput),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (parsed.brandName) payload.brandName = parsed.brandName;
    if (parsed.warehouseLocation) payload.warehouseLocation = parsed.warehouseLocation;
    if (parsed.notes) payload.notes = parsed.notes;
    if (normalized.subcategoryId ?? parsed.subcategoryId) {
      payload.subcategoryId = normalized.subcategoryId ?? parsed.subcategoryId;
    }
    if (parsed.purchasePrice != null) payload.purchasePrice = parsed.purchasePrice;
    if (parsed.sellPrice != null) payload.sellPrice = parsed.sellPrice;
    payload.updatedByUserId = context.uid;

    if (itemId) {
      await db.collection("inventoryItems").doc(itemId).set(payload, { merge: true });
      return itemId;
    }
    const created = await db.collection("inventoryItems").add({
      ...payload,
      totalOnHand: 0,
      totalReserved: 0,
      totalAvailable: 0,
      stockValue: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdByUserId: context.uid,
    });
    return created.id;
  }

  return {
    createDonor: async (input) => {
      const donor = buildDonorInputFromMigrationRow(
        input.values,
        companyId,
        context.uid,
      );
      if (!donor) throw new Error("Донор без марки, модели и VIN");
      return persistDonorAdmin(donor);
    },

    updateDonor: async (existingId, input) => {
      const donor = buildDonorInputFromMigrationRow(input.values, companyId, context.uid);
      if (!donor) return;
      // Reuse the same writer with the existing id so an update cannot drift
      // from a create in how it normalizes.
      await persistDonorAdmin({ ...donor, id: existingId });
    },

    createEngine: async (input) => writeMotor(input.values, nextLocalId(usedLocalIds)),

    updateEngine: async (existingId, input) => {
      await writeMotor(input.values, Number(existingId), { existing: true });
    },

    createInventoryItem: async (input) =>
      writeInventoryItem(input.values, input.kind, input.entityId),

    updateInventoryItem: async (existingId, input) => {
      await writeInventoryItem(input.values, input.kind, input.entityId, existingId);
    },

    /**
     * Attach a part or an engine to its donor.
     *
     * Written after both records exist — the plan's ordering guarantees it —
     * so the reference is never dangling.
     */
    linkToDonor: async ({ childId, donorId, kind }) => {
      if (kind === "engine") {
        await db
          .collection("users")
          .doc(context.uid)
          .collection("motors")
          .doc(childId)
          .set({ donorId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return;
      }
      await db
        .collection("inventoryItems")
        .doc(childId)
        .set({ donorId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    },
  };
}

/**
 * What the company already has, in the shape the plan matches against.
 *
 * Read once before planning rather than per entity: a thousand-row import
 * otherwise becomes a thousand round-trips, and the answer cannot change
 * mid-run in a way that matters.
 */
export async function buildExistingIndex(params: {
  companyId: string;
  uid: string;
}): Promise<ExistingIndex> {
  const db = getAdminFirestore();
  const companyId = normalizeCompanyId(params.companyId);

  const [donorSnapshot, motorSnapshot, itemSnapshot] = await Promise.all([
    db.collection("companies").doc(companyId).collection("donors").get(),
    db.collection("users").doc(params.uid).collection("motors").get(),
    db.collection("inventoryItems").where("companyId", "==", companyId).get(),
  ]);

  const donorVins = new Map<string, string>();
  for (const doc of donorSnapshot.docs) {
    const vin = String((doc.data() as { vin?: unknown }).vin ?? "").trim();
    if (vin) donorVins.set(foldKey(vin), doc.id);
  }

  const motorSerials = new Map<string, string>();
  for (const doc of motorSnapshot.docs) {
    const serial = String((doc.data() as { serialCode?: unknown }).serialCode ?? "").trim();
    if (serial) motorSerials.set(foldKey(serial), doc.id);
  }

  const itemSkus = new Map<string, string>();
  for (const doc of itemSnapshot.docs) {
    const sku = String((doc.data() as { sku?: unknown }).sku ?? "").trim();
    if (sku) itemSkus.set(foldKey(sku), doc.id);
  }

  return { donorVins, motorSerials, itemSkus };
}
