import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { TOP_LEVEL_COLLECTIONS } from "@/infrastructure/firestore/collections";
import { normalizeCompanyId } from "@/lib/company-id";
import { getMobileLocationContents } from "@/lib/mobile/location-contents.server";
import { describeToolError, toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";

/**
 * Resolve a scanned barcode or a display code ("A-3") to a location document id.
 *
 * `getMobileLocationContents` takes an id, but users and the model both speak
 * in codes, so this widens the input without loosening the company check the
 * helper performs.
 */
async function resolveLocationId(companyId: string, raw: string): Promise<string | null> {
  const value = raw.trim();
  if (!value) return null;

  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);

  const direct = await db.collection(TOP_LEVEL_COLLECTIONS.warehouseLocations).doc(value).get();
  if (direct.exists) {
    const data = direct.data() as Record<string, unknown>;
    if (normalizeCompanyId(String(data.companyId ?? "")) === normalized) return direct.id;
  }

  for (const field of ["barcode", "displayCode", "code"] as const) {
    const snapshot = await db
      .collection(TOP_LEVEL_COLLECTIONS.warehouseLocations)
      .where("companyId", "==", normalized)
      .where(field, "==", value)
      .limit(1)
      .get();
    if (!snapshot.empty) return snapshot.docs[0]!.id;
  }

  return null;
}

export async function getWarehouseLocation(ctx: CoreToolContext, input: { locationId: string }) {
  if (ctx.scopes.inventory === "none") {
    return toolFailure("You do not have access to the warehouse in this company.");
  }

  const locationId = await resolveLocationId(ctx.companyId, input.locationId);
  if (!locationId) {
    return toolFailure(`No warehouse location matches "${input.locationId}".`);
  }

  try {
    const contents = await getMobileLocationContents({ companyId: ctx.companyId, locationId });

    return {
      ok: true as const,
      location: {
        id: contents.location.id,
        displayCode: contents.location.displayCode,
        label: contents.location.label,
        type: contents.location.type,
        warehouseId: contents.location.warehouseId,
        href: `/warehouse?location=${encodeURIComponent(contents.location.id)}`,
      },
      occupancy: contents.occupancy,
      items: contents.items.map((item) => ({
        kind: item.kind,
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        quantity: item.quantity,
        sku: item.sku,
        serialCode: item.serialCode,
      })),
    };
  } catch (error) {
    return toolFailure(describeToolError(error, "Could not read that warehouse location."));
  }
}
