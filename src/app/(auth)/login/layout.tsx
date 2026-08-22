import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { marketingRoute } from "@/lib/marketing-routes";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to AutoCore — software for dismantlers and repair shops.",
  robots: {
    index: true,
    follow: true,
  },
};

type LoginLayoutProps = {
  children: ReactNode;
};

export default function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <>
      <Suspense fallback={children}>{children}</Suspense>
      <footer className="border-t border-border/60 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          AutoCore is cloud software for auto dismantlers, engine sellers, and repair shops.
          Pricing: $40/month or $400/year per company. Contact{" "}
          <a href="mailto:support@myautocore.com" className="underline underline-offset-4">
            support@myautocore.com
          </a>
          .
        </p>
        <p className="mt-3">
          <Link href={marketingRoute("terms")} className="underline underline-offset-4">
            Terms of Use
          </Link>
          {" · "}
          <Link href={marketingRoute("privacy")} className="underline underline-offset-4">
            Privacy Policy
          </Link>
          {" · "}
          <Link href={marketingRoute("refund")} className="underline underline-offset-4">
            Refund Policy
          </Link>
        </p>
      </footer>
    </>
  );
}
