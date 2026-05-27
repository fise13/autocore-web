"use client";

import { ReactNode, createContext, useContext } from "react";

type DashboardLayoutContextValue = {
  sidebarVisible: boolean;
  toggleSidebar: () => void;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({
  children,
  sidebarVisible,
  toggleSidebar,
}: {
  children: ReactNode;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
}) {
  return (
    <DashboardLayoutContext.Provider value={{ sidebarVisible, toggleSidebar }}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error("useDashboardLayout must be used inside DashboardLayoutProvider");
  }
  return context;
}
