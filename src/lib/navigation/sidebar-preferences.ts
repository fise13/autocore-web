import type { SidebarPosition } from "@/lib/navigation/sidebar-customization";
import {
  DEFAULT_SIDEBAR_CUSTOMIZATION,
  readSidebarCustomization,
  SIDEBAR_CUSTOMIZATION_STORAGE_KEY,
} from "@/lib/navigation/sidebar-customization";
import { PINNED_FILTER_IDS, type PinnedFilterId } from "@/lib/navigation/pinned-filters";

export type SidebarSectionId =
  | "inventory"
  | "brands"
  | "filters"
  | "quickActions";

export type SidebarPreferencesV2 = {
  version: 2;
  position: SidebarPosition;
  collapsedSections: Partial<Record<SidebarSectionId, boolean>>;
  pinnedFilterOrder: PinnedFilterId[];
  favoriteBrandLocalIds: number[];
  hiddenPinnedFilters: PinnedFilterId[];
};

export const SIDEBAR_PREFERENCES_STORAGE_KEY = "autocore-sidebar-preferences-v2";

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarPreferencesV2 = {
  version: 2,
  position: "left",
  collapsedSections: {},
  pinnedFilterOrder: [...PINNED_FILTER_IDS],
  favoriteBrandLocalIds: [],
  hiddenPinnedFilters: [],
};

const ALL_PINNED_FILTER_IDS = new Set<PinnedFilterId>(PINNED_FILTER_IDS);

function mergePinnedFilterOrder(stored: PinnedFilterId[] | undefined): PinnedFilterId[] {
  const seen = new Set<PinnedFilterId>();
  const merged: PinnedFilterId[] = [];
  for (const id of stored ?? []) {
    if (!ALL_PINNED_FILTER_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  for (const id of PINNED_FILTER_IDS) {
    if (!seen.has(id)) merged.push(id);
  }
  return merged;
}

export function normalizeSidebarPreferences(
  input: Partial<SidebarPreferencesV2> | null | undefined,
): SidebarPreferencesV2 {
  if (!input) return DEFAULT_SIDEBAR_PREFERENCES;

  const favoriteBrandLocalIds = Array.isArray(input.favoriteBrandLocalIds)
    ? input.favoriteBrandLocalIds.filter((id) => Number.isFinite(id))
    : [];

  const hiddenPinnedFilters = Array.isArray(input.hiddenPinnedFilters)
    ? input.hiddenPinnedFilters.filter((id): id is PinnedFilterId => ALL_PINNED_FILTER_IDS.has(id))
    : [];

  return {
    version: 2,
    position: input.position === "right" ? "right" : "left",
    collapsedSections:
      typeof input.collapsedSections === "object" && input.collapsedSections !== null
        ? input.collapsedSections
        : {},
    pinnedFilterOrder: mergePinnedFilterOrder(input.pinnedFilterOrder),
    favoriteBrandLocalIds,
    hiddenPinnedFilters,
  };
}

export function migrateV1ToV2(): SidebarPreferencesV2 {
  const v1 = readSidebarCustomization();
  return normalizeSidebarPreferences({
    version: 2,
    position: v1.position,
  });
}

export function readSidebarPreferences(): SidebarPreferencesV2 {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_PREFERENCES;
  try {
    const raw = localStorage.getItem(SIDEBAR_PREFERENCES_STORAGE_KEY);
    if (raw) {
      return normalizeSidebarPreferences(JSON.parse(raw) as Partial<SidebarPreferencesV2>);
    }
    const legacyRaw = localStorage.getItem(SIDEBAR_CUSTOMIZATION_STORAGE_KEY);
    if (legacyRaw) {
      return migrateV1ToV2();
    }
    return DEFAULT_SIDEBAR_PREFERENCES;
  } catch {
    return DEFAULT_SIDEBAR_PREFERENCES;
  }
}

export function writeSidebarPreferences(preferences: SidebarPreferencesV2) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SIDEBAR_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeSidebarPreferences(preferences)),
  );
}

export function isSectionCollapsed(
  preferences: SidebarPreferencesV2,
  sectionId: SidebarSectionId,
  defaultCollapsed = false,
): boolean {
  const value = preferences.collapsedSections[sectionId];
  return typeof value === "boolean" ? value : defaultCollapsed;
}

export function visiblePinnedFilters(preferences: SidebarPreferencesV2): PinnedFilterId[] {
  const hidden = new Set(preferences.hiddenPinnedFilters);
  return preferences.pinnedFilterOrder.filter((id) => !hidden.has(id));
}
