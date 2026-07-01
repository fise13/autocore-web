"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useWorkspace } from "@/components/layout/workspace-context";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";
import {
  parseCollectionFromSearchParams,
  type InventoryCollectionId,
} from "@/lib/navigation/inventory-collections";
import { pinnedFilterToAvailability } from "@/lib/navigation/pinned-filters";
import {
  collectionUsesSpecificSheets,
  resolveDefaultGearboxCategory,
  specificCategoriesForCollection,
} from "@/lib/navigation/specific-categories-for-collection";

type UseInventoryCollectionSyncParams = {
  specificCategories: SpecificCategoryEntity[];
  enabled?: boolean;
};

export function useInventoryCollectionSync({
  specificCategories,
  enabled = true,
}: UseInventoryCollectionSyncParams) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspace = useWorkspace();
  const {
    selectedSpecificCategoryId,
    setSelectedSpecificCategoryId,
    setSelectedBrandLocalId,
    setAvailability,
  } = workspace;

  const parsed = useMemo(
    () => parseCollectionFromSearchParams(searchParams, pathname),
    [pathname, searchParams],
  );

  useEffect(() => {
    if (!enabled) return;

    if (pathname === "/sold") {
      setAvailability("sold");
      return;
    }

    if (parsed.brandLocalId != null) {
      setSelectedBrandLocalId(parsed.brandLocalId);
    }

    setAvailability(pinnedFilterToAvailability(parsed.filter));

    if (pathname === "/warehouse") {
      setSelectedSpecificCategoryId(null);
      if (searchParams.get("subcategory")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("subcategory");
        const query = params.toString();
        router.replace(query ? `/warehouse?${query}` : "/warehouse");
      }
      return;
    }

    if (pathname !== "/motors" && !pathname.startsWith("/specific/")) {
      return;
    }

    syncSpecificCategoryForCollection({
      collection: parsed.collection,
      categories: specificCategories,
      selectedCategoryId: selectedSpecificCategoryId,
      setSelectedCategoryId: setSelectedSpecificCategoryId,
    });
  }, [
    enabled,
    parsed.brandLocalId,
    parsed.collection,
    parsed.filter,
    pathname,
    router,
    searchParams,
    selectedSpecificCategoryId,
    setAvailability,
    setSelectedBrandLocalId,
    setSelectedSpecificCategoryId,
    specificCategories,
  ]);

  return parsed;
}

export function syncSpecificCategoryForCollection(params: {
  collection: InventoryCollectionId;
  categories: SpecificCategoryEntity[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (value: string | null) => void;
}) {
  if (params.collection === "engines") {
    if (params.selectedCategoryId) {
      params.setSelectedCategoryId(null);
    }
    return;
  }

  if (params.collection === "transmissions") {
    const gearbox = resolveDefaultGearboxCategory(params.categories);
    if (gearbox && params.selectedCategoryId !== gearbox.id) {
      params.setSelectedCategoryId(gearbox.id);
    }
    return;
  }

  if (!collectionUsesSpecificSheets(params.collection)) {
    return;
  }

  const matching = specificCategoriesForCollection(params.collection, params.categories);

  if (params.selectedCategoryId) {
    const stillValid = matching.some((category) => category.id === params.selectedCategoryId);
    if (!stillValid) {
      params.setSelectedCategoryId(matching.length === 1 ? matching[0]?.id ?? null : null);
    }
    return;
  }

  if (matching.length === 1) {
    params.setSelectedCategoryId(matching[0]?.id ?? null);
  }
}
