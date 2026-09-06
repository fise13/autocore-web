"use client";

import { Compass, LogOut, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { isAiGuideSession } from "@/lib/playground/ai-guide/config";
import { clearAiGuideSessionMarker } from "@/lib/playground/ai-guide/session.client";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export function AiGuidePlaygroundBanner() {
  const { logout, profile, firebaseUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const enabled = isAiGuideSession({
    email: firebaseUser?.email,
    companyId: profile?.companyId ?? null,
  });

  if (!enabled) return null;

  async function resetPlayground() {
    setBusy(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) return;
      await fetch("/api/playground/ai-guide/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": profile?.companyId ?? "",
        },
      });
      window.location.assign("/help");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative z-40 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2 md:px-6"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Compass className="size-4 shrink-0 text-foreground" aria-hidden />
        <p className="truncate text-foreground">
          <span className="font-medium">AI Guide playground</span>
          <span className="hidden text-muted-foreground sm:inline">
            {" "}
            · Ridgeway Performance — isolated test company, not Live
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" variant="ghost" nativeButton={false} render={<Link href="/help" />}>
          Help
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void resetPlayground()}
        >
          <RotateCcw className="size-3.5" />
          Reset data
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            clearAiGuideSessionMarker();
            void logout();
          }}
        >
          <LogOut className="size-3.5" />
          Exit
        </Button>
      </div>
    </div>
  );
}
