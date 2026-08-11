import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";

/**
 * The route context sent with every Core request.
 *
 * Mirrors the zod schema in `src/app/api/assistant/route.ts`; kept in its own
 * module so the client transport can type it without importing the route.
 */
export type AssistantRequestContext = {
  pathname: string;
  collection?: InventoryCollectionId;
  brandName?: string | null;
  selectionLabel?: string | null;
};
