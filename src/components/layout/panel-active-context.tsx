"use client";

import { createContext, useContext, type ReactNode } from "react";

const PanelActiveContext = createContext(true);

/** Whether the nearest cached panel (route or inventory collection) is the visible one. */
export function usePanelActive(): boolean {
  return useContext(PanelActiveContext);
}

export function PanelActiveProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return <PanelActiveContext.Provider value={active}>{children}</PanelActiveContext.Provider>;
}
