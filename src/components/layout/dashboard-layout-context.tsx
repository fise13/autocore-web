"use client";

import { ReactNode, createContext, useContext } from "react";

type DashboardLayoutContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({
  children,
  sidebarCollapsed,
  toggleSidebar,
}: {
  children: ReactNode;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}) {
  return (
    <DashboardLayoutContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
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
