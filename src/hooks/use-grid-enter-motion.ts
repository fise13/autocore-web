"use client";

import { useEffect, useState } from "react";

/** Short-lived flag for one-shot grid row stagger on mount. */
export function useGridEnterMotion(durationMs = 260): boolean {
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntering(false), durationMs);
    return () => window.clearTimeout(timer);
  }, []);

  return entering;
}
