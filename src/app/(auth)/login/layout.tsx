import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { DesktopLoginBoot } from "./desktop-login-boot";
import { marketingRoute } from "@/lib/marketing-routes";

const WEB_METADATA: Metadata = {
  title: "Sign in",
  description: "Sign in to AutoCore — software for dismantlers and repair shops.",
  robots: {
    index: true,
    follow: true,
  },
};

const DESKTOP_METADATA: Metadata = {
  title: "AutoCore",
  robots: {
    index: false,
    follow: false,
  },
};

function isDesktopUserAgent(userAgent: string | null): boolean {
  return /AutoCoreDesktop\//i.test(userAgent ?? "");
}

export async function generateMetadata(): Promise<Metadata> {
  const userAgent = (await headers()).get("user-agent");
  return isDesktopUserAgent(userAgent) ? DESKTOP_METADATA : WEB_METADATA;
}

type LoginLayoutProps = {
  children: ReactNode;
};

export default async function LoginLayout({ children }: LoginLayoutProps) {
  const userAgent = (await headers()).get("user-agent");
  if (isDesktopUserAgent(userAgent)) {
    return (
      <Suspense fallback={null}>
        <DesktopLoginBoot>{children}</DesktopLoginBoot>
      </Suspense>
    );
  }

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
