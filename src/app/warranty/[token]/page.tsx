"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type WarrantyPayload = {
  companyName: string;
  serialCode: string;
  engineCode?: string;
  vin?: string;
  licensePlate?: string;
  installedAt: string;
  expiresAt: string;
  expiresAtMileage: number;
  status: string;
};

export default function WarrantyVerifyPage() {
  const params = useParams<{ token: string }>();
  const [payload, setPayload] = useState<WarrantyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.token;
    if (!token) return;

    void fetch(`/api/warranty/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Гарантия не найдена");
        }
        return response.json() as Promise<WarrantyPayload>;
      })
      .then(setPayload)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Ошибка проверки"));
  }, [params.token]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
        <div className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
        <p className="w-full text-center text-sm text-muted-foreground">Проверяем гарантию…</p>
      </main>
    );
  }

  const active = payload.status === "active";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
      <article className="w-full space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Проверка гарантии</p>
          <h1 className="text-xl font-semibold">{payload.companyName || "СТО"}</h1>
        </header>

        <div
          className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${
            active ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-800"
          }`}
        >
          {active ? "Гарантия действует" : "Гарантия недействительна или истекла"}
        </div>

        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Двигатель</dt>
            <dd className="font-medium">{[payload.engineCode, payload.serialCode].filter(Boolean).join(" · ")}</dd>
          </div>
          {payload.vin ? (
            <div>
              <dt className="text-muted-foreground">VIN</dt>
              <dd className="font-medium">{payload.vin}</dd>
            </div>
          ) : null}
          {payload.licensePlate ? (
            <div>
              <dt className="text-muted-foreground">Госномер</dt>
              <dd className="font-medium">{payload.licensePlate}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Установлен</dt>
            <dd className="font-medium">{new Intl.DateTimeFormat("ru-KZ").format(new Date(payload.installedAt))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Действует до</dt>
            <dd className="font-medium">
              {new Intl.DateTimeFormat("ru-KZ").format(new Date(payload.expiresAt))} · до{" "}
              {payload.expiresAtMileage.toLocaleString("ru-KZ")} км
            </dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
