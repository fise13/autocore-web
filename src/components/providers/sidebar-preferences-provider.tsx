"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_SIDEBAR_PREFERENCES,
  normalizeSidebarPreferences,
  readSidebarPreferences,
  writeSidebarPreferences,
  type SidebarPreferencesV2,
  type SidebarSectionId,
} from "@/lib/navigation/sidebar-preferences";
import type { PinnedFilterId } from "@/lib/navigation/pinned-filters";

type SidebarPreferencesContextValue = {
  preferences: SidebarPreferencesV2;
  hydrated: boolean;
  setPreferences: (
    next: SidebarPreferencesV2 | ((prev: SidebarPreferencesV2) => SidebarPreferencesV2),
  ) => void;
  toggleSection: (sectionId: SidebarSectionId) => void;
  toggleFavoriteBrand: (brandLocalId: number) => void;
  reorderPinnedFilters: (order: PinnedFilterId[]) => void;
  hidePinnedFilter: (filterId: PinnedFilterId) => void;
  showPinnedFilter: (filterId: PinnedFilterId) => void;
};

const SidebarPreferencesContext = createContext<SidebarPreferencesContextValue | null>(null);

export function SidebarPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<SidebarPreferencesV2>(
    DEFAULT_SIDEBAR_PREFERENCES,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferencesState(readSidebarPreferences());
    setHydrated(true);
  }, []);

  const setPreferences = useCallback(
    (next: SidebarPreferencesV2 | ((prev: SidebarPreferencesV2) => SidebarPreferencesV2)) => {
      setPreferencesState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const normalized = normalizeSidebarPreferences(resolved);
        writeSidebarPreferences(normalized);
        return normalized;
      });
    },
    [],
  );

  const toggleSection = useCallback(
    (sectionId: SidebarSectionId) => {
      setPreferences((prev) => ({
        ...prev,
        collapsedSections: {
          ...prev.collapsedSections,
          [sectionId]: !prev.collapsedSections[sectionId],
        },
      }));
    },
    [setPreferences],
  );

  const toggleFavoriteBrand = useCallback(
    (brandLocalId: number) => {
      setPreferences((prev) => {
        const favorites = new Set(prev.favoriteBrandLocalIds);
        if (favorites.has(brandLocalId)) favorites.delete(brandLocalId);
        else favorites.add(brandLocalId);
        return { ...prev, favoriteBrandLocalIds: [...favorites] };
      });
    },
    [setPreferences],
  );

  const reorderPinnedFilters = useCallback(
    (order: PinnedFilterId[]) => {
      setPreferences((prev) => ({ ...prev, pinnedFilterOrder: order }));
    },
    [setPreferences],
  );

  const hidePinnedFilter = useCallback(
    (filterId: PinnedFilterId) => {
      setPreferences((prev) => ({
        ...prev,
        hiddenPinnedFilters: [...new Set([...prev.hiddenPinnedFilters, filterId])],
      }));
    },
    [setPreferences],
  );

  const showPinnedFilter = useCallback(
    (filterId: PinnedFilterId) => {
      setPreferences((prev) => ({
        ...prev,
        hiddenPinnedFilters: prev.hiddenPinnedFilters.filter((id) => id !== filterId),
      }));
    },
    [setPreferences],
  );

  const value = useMemo(
    () => ({
      preferences,
      hydrated,
      setPreferences,
      toggleSection,
      toggleFavoriteBrand,
      reorderPinnedFilters,
      hidePinnedFilter,
      showPinnedFilter,
    }),
    [
      hidePinnedFilter,
      hydrated,
      preferences,
      reorderPinnedFilters,
      setPreferences,
      showPinnedFilter,
      toggleFavoriteBrand,
      toggleSection,
    ],
  );

  return (
    <SidebarPreferencesContext.Provider value={value}>
      {children}
    </SidebarPreferencesContext.Provider>
  );
}

export function useSidebarPreferences() {
  const context = useContext(SidebarPreferencesContext);
  if (!context) {
    throw new Error("useSidebarPreferences must be used within SidebarPreferencesProvider");
  }
  return context;
}
