"use client";

import { LogOut, Sparkles } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useDemoSession } from "@/hooks/use-demo-session";
import { userCopy } from "@/lib/user-copy";

export function DemoSessionBanner() {
  const { logout } = useAuth();
  const isDemo = useDemoSession();
  const [busy, setBusy] = useState(false);

  if (!isDemo) return null;

  return (
    <div
      className="relative z-40 flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 bg-primary/8 px-4 py-2 md:px-6"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="truncate text-foreground">
          <span className="font-medium">{userCopy.demo.bannerTitle}</span>
          <span className="hidden text-muted-foreground sm:inline"> · {userCopy.demo.bannerHint}</span>
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 border-primary/25 bg-background/80"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void logout().finally(() => setBusy(false));
        }}
      >
        <LogOut className="size-3.5" aria-hidden />
        {busy ? userCopy.demo.exiting : userCopy.demo.exit}
      </Button>
    </div>
  );
}
