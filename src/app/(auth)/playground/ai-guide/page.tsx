"use client";

import Link from "next/link";
import { signInWithCustomToken } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth, isFirebaseConfigured } from "@/infrastructure/firebase/client";
import { prepareSyncAuth } from "@/lib/auth/prepare-sync-auth";
import { AI_GUIDE_ACCOUNT_EMAIL } from "@/lib/playground/ai-guide/config";
import { markAiGuideSessionActive } from "@/lib/playground/ai-guide/session.client";
import { appLoginUrl, marketingHomeUrl } from "@/lib/site-urls";

type AuthPayload = { type: "customToken"; token: string };

export default function AiGuidePlaygroundPage() {
  const router = useRouter();
  const { firebaseUser, isLoading, isFirebaseReady, refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseReady || isLoading || startedRef.current) return;

    const alreadyPlayground =
      firebaseUser?.email?.trim().toLowerCase() === AI_GUIDE_ACCOUNT_EMAIL.toLowerCase();
    if (alreadyPlayground) {
      markAiGuideSessionActive();
      router.replace("/help");
      return;
    }

    startedRef.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/playground/ai-guide/token", { method: "POST" });
        const body = (await response.json().catch(() => null)) as
          | AuthPayload
          | { error?: string }
          | null;

        if (!response.ok || !body || !("type" in body)) {
          const message =
            body && "error" in body && body.error ? body.error : "Playground unavailable";
          throw new Error(message);
        }

        const auth = getFirebaseAuth();
        await signInWithCustomToken(auth, body.token);
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) throw new Error("Playground unavailable");

        await prepareSyncAuth(user.uid, { force: true });
        await refreshProfile();
        markAiGuideSessionActive();
        router.replace("/help");
      } catch (cause) {
        const detail = cause instanceof Error ? ` ${cause.message}` : "";
        setError(
          `Could not open the AI Guide playground as ${AI_GUIDE_ACCOUNT_EMAIL}.${detail}`,
        );
      }
    })();
  }, [firebaseUser, isFirebaseReady, isLoading, refreshProfile, router]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">AI Guide playground unavailable</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button render={<Link href={appLoginUrl()} />}>Sign in</Button>
          <Button variant="outline" render={<Link href={marketingHomeUrl()} />}>
            Back home
          </Button>
        </div>
      </div>
    );
  }

  return <AppLoadingScreen locale="en" message="Opening the AI Guide playground…" />;
}
