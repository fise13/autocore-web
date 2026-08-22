"use client";

import { createContext, useContext, type ReactNode } from "react";

const PaddleCountryContext = createContext<string | null>(null);

export function PaddleCountryProvider({
  country,
  children,
}: {
  country: string | null;
  children: ReactNode;
}) {
  return <PaddleCountryContext.Provider value={country}>{children}</PaddleCountryContext.Provider>;
}

export function usePaddleCountry(): string | null {
  return useContext(PaddleCountryContext);
}
