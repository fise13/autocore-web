import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { CookieConsentBanner } from "@/components/analytics/cookie-consent-banner";
import { GoogleAnalyticsTag } from "@/components/analytics/google-analytics-tag";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { getAppUrl } from "@/lib/site-urls";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
        <Analytics />
        {/*
          Renders nothing unless a measurement id is configured, so local and
          preview builds never write into the production property. Which id is
          used depends on the host — see `lib/analytics/ga-config.ts` for why a
          single stream across both domains is the shape that lets Google Ads
          attribute a signup to the ad that paid for it.
        */}
        <GoogleAnalyticsTag />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
