"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { storeInviteToken } from "@/lib/invites/pending-invite";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token")?.trim() || searchParams.get("invite")?.trim();
    if (token) {
      storeInviteToken(token);
    }
    router.replace("/login");
  }, [router, searchParams]);

  return <AppLoadingScreen message="Переход к входу…" />;
}
