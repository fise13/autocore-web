"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { marketingRoute } from "@/lib/marketing-routes";
import { marketingHomeUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

const SUPPORT_EMAIL = "support@myautocore.com";

export function AppPublicHome() {
  const router = useRouter();
  const { firebaseUser, isLoading, isFirebaseReady } = useAuth();

  useEffect(() => {
    if (!isFirebaseReady || isLoading || !firebaseUser) return;
    router.replace("/home");
  }, [firebaseUser, isFirebaseReady, isLoading, router]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        AutoCore
      </p>
      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Cloud software for auto dismantlers, engine sellers, and repair shops
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
        Manage warehouse inventory, serialized engines, work orders, documents, accounting, and team
        access from web, desktop, and mobile — one subscription per company.
      </p>

      <dl className="mt-8 grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">Pricing</dt>
          <dd className="mt-1 text-muted-foreground">$15 / month or $150 / year per company</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Trial</dt>
          <dd className="mt-1 text-muted-foreground">14-day free trial; payment method required</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Seller</dt>
          <dd className="mt-1 text-muted-foreground">
            Victor Mishkin, trading as AutoCore, Tbilisskaya 13, Almaty 050000, Kazakhstan
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Contact</dt>
          <dd className="mt-1">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {SUPPORT_EMAIL}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
          Sign in or register
        </Link>
        <a
          href={marketingHomeUrl()}
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          Product website
        </a>
      </div>

      <nav
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"
        aria-label={userCopy.commonUi.legalNavAria}
      >
        <Link href={marketingRoute("terms")} className="underline underline-offset-4 hover:text-foreground">
          Terms of Use
        </Link>
        <Link
          href={marketingRoute("privacy")}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Privacy Policy
        </Link>
        <Link
          href={marketingRoute("refund")}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Refund Policy
        </Link>
      </nav>
    </main>
  );
}
