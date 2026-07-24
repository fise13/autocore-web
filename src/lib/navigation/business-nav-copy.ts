import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { userCopy } from "@/lib/user-copy";

/** Locale-aware nav labels — always read through userCopy (never freeze at module load). */
export const businessNavCopy = {
  get workspace() {
    return userCopy.nav.workspace;
  },
  get business() {
    return userCopy.nav.business;
  },
  get collections() {
    return userCopy.nav.collections;
  },
  get quickActions() {
    return userCopy.nav.quickActions;
  },
  get empty() {
    return userCopy.nav.empty;
  },
  get inventoryCollection() {
    return userCopy.nav.inventoryCollection;
  },
  get groupBusiness() {
    return userCopy.nav.groupBusiness;
  },
};

export function inventoryCollectionLabel(collection: InventoryCollectionId): string {
  return userCopy.nav.inventoryCollection[collection];
}
