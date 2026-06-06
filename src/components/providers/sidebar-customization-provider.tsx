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
  DEFAULT_SIDEBAR_CUSTOMIZATION,
  SidebarCustomization,
  normalizeSidebarCustomization,
  readSidebarCustomization,
  writeSidebarCustomization,
} from "@/lib/navigation/sidebar-customization";

type SidebarCustomizationContextValue = {
  customization: SidebarCustomization;
  hydrated: boolean;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  toggleEditing: () => void;
  setCustomization: (next: SidebarCustomization | ((prev: SidebarCustomization) => SidebarCustomization)) => void;
  resetCustomization: () => void;
};

const SidebarCustomizationContext = createContext<SidebarCustomizationContextValue | null>(null);

export function SidebarCustomizationProvider({ children }: { children: ReactNode }) {
  const [customization, setCustomizationState] = useState<SidebarCustomization>(
    DEFAULT_SIDEBAR_CUSTOMIZATION,
  );
  const [hydrated, setHydrated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setCustomizationState(readSidebarCustomization());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SidebarCustomization) => {
    const normalized = normalizeSidebarCustomization(next);
    setCustomizationState(normalized);
    writeSidebarCustomization(normalized);
  }, []);

  const setCustomization = useCallback(
    (next: SidebarCustomization | ((prev: SidebarCustomization) => SidebarCustomization)) => {
      setCustomizationState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const normalized = normalizeSidebarCustomization(resolved);
        writeSidebarCustomization(normalized);
        return normalized;
      });
    },
    [],
  );

  const resetCustomization = useCallback(() => {
    persist(DEFAULT_SIDEBAR_CUSTOMIZATION);
  }, [persist]);

  const toggleEditing = useCallback(() => {
    setIsEditing((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      customization,
      hydrated,
      isEditing,
      setIsEditing,
      toggleEditing,
      setCustomization,
      resetCustomization,
    }),
    [customization, hydrated, isEditing, resetCustomization, setCustomization, toggleEditing],
  );

  return (
    <SidebarCustomizationContext.Provider value={value}>{children}</SidebarCustomizationContext.Provider>
  );
}

export function useSidebarCustomization() {
  const context = useContext(SidebarCustomizationContext);
  if (!context) {
    throw new Error("useSidebarCustomization must be used within SidebarCustomizationProvider");
  }
  return context;
}
