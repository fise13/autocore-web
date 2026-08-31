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
          Production hosts load the Google tag (G-QEVTMP0BYB) for Ads conversion
          import. Local and preview builds stay silent unless an env id is set,
          so they never write into the property the ads account is judged on.
          See `lib/analytics/ga-config.ts`.
        */}
        <GoogleAnalyticsTag />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
