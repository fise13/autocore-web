"use client";

import { useEffect } from "react";

import { useDemoSession } from "@/hooks/use-demo-session";
import { installDemoExitReset } from "@/lib/demo/demo-session.client";

/** Keeps a fresh ID token and resets demo data when the tab closes without logout. */
export function useDemoExitReset(): void {
  const isDemo = useDemoSession();

  useEffect(() => {
    if (!isDemo) return;
    return installDemoExitReset();
  }, [isDemo]);
}
