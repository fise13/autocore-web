"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export default function DeckCallbackPage() {
  const router = useRouter();
  const { firebaseUser, isLoading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    if (!isLoading && !firebaseUser) {
      router.replace("/login?source=deck");
    }
  }, [firebaseUser, isLoading, router]);

  useEffect(() => {
    if (isLoading || !firebaseUser) return;

    let cancelled = false;
    setLoadingCode(true);

    void (async () => {
      try {
        const auth = getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken(true);
        if (!idToken) throw new Error("Не удалось получить токен авторизации");

        const response = await fetch("/api/desktop/auth/code", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        });

        const payload = (await response.json()) as { code?: string; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось создать код");
        }
        if (!cancelled) setCode(payload.code ?? null);
      } catch (issue) {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : "Не удалось создать код");
        }
      } finally {
        if (!cancelled) setLoadingCode(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, isLoading]);

  if (isLoading || loadingCode) {
    return <AppLoadingScreen message="Готовим код для Autocore Deck…" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Подключение Autocore Deck</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Код подключения</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Введите этот код в настройках Deck в течение 5 минут.
        </p>

        {error ? (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        ) : (
          <p className="mt-6 font-mono text-4xl font-semibold tracking-[0.3em] text-foreground">
            {code ?? "------"}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            В Autocore Web
          </Button>
          <Button onClick={() => window.location.reload()}>Обновить код</Button>
        </div>
      </div>
    </div>
  );
}
