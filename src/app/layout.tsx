import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { CookieConsentBanner } from "@/components/analytics/cookie-consent-banner";
import { GoogleAdsSubscriptionConversion } from "@/components/analytics/google-ads-subscription-conversion";
import { GoogleAnalyticsPageViews } from "@/components/analytics/google-analytics-pageviews";
import { GoogleAnalyticsTag } from "@/components/analytics/google-analytics-tag";
import { GoogleTagHead } from "@/components/analytics/google-tag-head";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { embeddedGoogleTagIds } from "@/lib/analytics/gtag-bootstrap";
import { getAppUrl } from "@/lib/site-urls";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e12" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleTagEmbedded = embeddedGoogleTagIds().length > 0;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <GoogleTagHead />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
        <Analytics />
        {/*
          Production HTML embeds GA4 (G-QEVTMP0BYB) plus Google Ads
          (AW-18344172044) as real <script> tags in <head>, Consent Mode
          denied until the banner is answered. The Подписка event snippet
          lives on /welcome. Local and preview stay silent unless an env id
          is set. See `lib/analytics/gtag-bootstrap.ts`.
        */}
        <GoogleAnalyticsTag embedded={googleTagEmbedded} />
        <Suspense fallback={null}>
          <GoogleAnalyticsPageViews />
          <GoogleAdsSubscriptionConversion />
        </Suspense>
        <CookieConsentBanner />
      </body>
    </html>
  );
}
