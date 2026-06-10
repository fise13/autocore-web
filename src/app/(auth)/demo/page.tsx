"use client";

import Link from "next/link";
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNT_EMAIL } from "@/lib/demo/demo-config";
import { getFirebaseAuth, isFirebaseConfigured } from "@/infrastructure/firebase/client";
import { prepareSyncAuth } from "@/lib/auth/prepare-sync-auth";
import { appLoginUrl, marketingHomeUrl } from "@/lib/site-urls";
import { userCopy } from "@/lib/user-copy";

type DemoAuthPayload =
  | { type: "customToken"; token: string }
  | { type: "password"; email: string; password: string };

export default function DemoPage() {
  const router = useRouter();
  const { firebaseUser, isLoading, isFirebaseReady, refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isFirebaseReady || isLoading || started) return;
    if (firebaseUser) {
      router.replace("/");
      return;
    }

    setStarted(true);

    void (async () => {
      try {
        const response = await fetch("/api/demo/token", { method: "POST" });
        const body = (await response.json().catch(() => null)) as
          | DemoAuthPayload
          | { error?: string }
          | null;

        if (!response.ok || !body || !("type" in body)) {
          const message =
            body && "error" in body && body.error
              ? body.error
              : "Demo unavailable";
          throw new Error(message);
        }

        const payload = body;
        const auth = getFirebaseAuth();

        if (payload.type === "customToken") {
          await signInWithCustomToken(auth, payload.token);
        } else {
          await signInWithEmailAndPassword(auth, payload.email, payload.password);
        }

        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
          throw new Error("Demo unavailable");
        }

        await prepareSyncAuth(user.uid, { force: true });
        await refreshProfile();
        sessionStorage.setItem("autocore-demo-session", "1");
        router.replace("/");
      } catch (cause) {
        const detail = cause instanceof Error && cause.message !== "Demo unavailable" ? ` ${cause.message}` : "";
        setError(
          `Не удалось открыть демо-аккаунт ${DEMO_ACCOUNT_EMAIL}.${detail} Попробуйте войти вручную или напишите в поддержку.`,
        );
      }
    })();
  }, [firebaseUser, isFirebaseReady, isLoading, refreshProfile, router, started]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center"
        data-login-screen
      >
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Демо временно недоступно</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button render={<Link href={appLoginUrl()} />}>Войти в аккаунт</Button>
          <Button variant="outline" render={<Link href={marketingHomeUrl()} />}>
            На главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-login-screen>
      <AppLoadingScreen message="Открываем демо AutoCore…" />
      <span className="sr-only">{userCopy.auth.completing}</span>
    </div>
  );
}
