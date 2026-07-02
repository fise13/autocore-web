"use client";

import { ReactNode } from "react";

type LandingLenisProviderProps = {
  children: ReactNode;
};

/** Native scroll on the marketing landing — Lenis caused jump when demo panels updated. */
export function LandingLenisProvider({ children }: LandingLenisProviderProps) {
  return <>{children}</>;
}
