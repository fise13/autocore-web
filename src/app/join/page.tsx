"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { storePendingInvite } from "@/lib/invites/pending-invite";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function redirectToLogin() {
      const token = searchParams.get("token")?.trim() || searchParams.get("invite")?.trim();
      if (token) {
        storePendingInvite({ token });
        try {
          const response = await fetch("/api/invites/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (response.ok) {
            const payload = (await response.json()) as { email?: string; companyName?: string };
            if (payload.email) {
              storePendingInvite({
                token,
                email: payload.email,
                companyName: payload.companyName,
              });
            }
          }
        } catch {
          // Token is stored; login can still proceed manually.
        }
      }
      router.replace("/login");
    }

    void redirectToLogin();
  }, [router, searchParams]);

  return <AppLoadingScreen message="Переход к входу…" />;
}
