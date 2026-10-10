import type { Metadata } from "next";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPANY } from "@/lib/motor-land/sale-document";

export const metadata: Metadata = {
  title: "Motor Land — вход",
  robots: { index: false, follow: false },
};

/**
 * Sign-in for the Motor Land document desk. A plain form posting to
 * `/api/motor-land/login`; see `lib/motor-land/desk-login.ts` for the rules.
 */
export default async function MotorLandLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/motor-land/logo.png"
            alt=""
            width={56}
            height={56}
            className="mb-4 size-14"
            priority
          />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Документы Motor Land
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{COMPANY.legalName}</p>
        </div>

        <form
          action="/api/motor-land/login"
          method="post"
          className="space-y-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Почта</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              className="h-10"
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-10"
              aria-invalid={error ? true : undefined}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              Неверная почта или пароль
            </p>
          ) : null}

          <Button type="submit" className="h-10 w-full">
            Войти
          </Button>
        </form>
      </main>
    </div>
  );
}
