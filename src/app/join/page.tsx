"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = searchParams.get("token")?.trim() || searchParams.get("invite")?.trim();
    if (token) {
      router.replace(`/invite/${encodeURIComponent(token)}`);
      return;
    }
    router.replace("/login");
  }, [router, searchParams]);

  return <AppLoadingScreen message="Переход к приглашению…" />;
}
