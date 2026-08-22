import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getAppUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Welcome to AutoCore Pro",
  description: "Your subscription is active. Sign in to your workspace.",
};

export default function WelcomePage() {
  const appUrl = getAppUrl().replace(/\/$/, "");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        AutoCore Pro
      </p>
      <h1 className="mt-4 max-w-lg text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        You&apos;re subscribed
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        Payment went through. Sign in to app.myautocore.com — your company workspace unlocks cloud
        sync, team access, and the full product.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href={`${appUrl}/login`} className={cn(buttonVariants({ size: "lg" }))}>
          Open the app
        </Link>
        <Link href="/" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Back to site
        </Link>
      </div>
    </main>
  );
}
