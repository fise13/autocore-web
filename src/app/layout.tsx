import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { getAppUrl } from "@/lib/site-urls";
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from "@/lib/analytics/ga-config";

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
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
        <Analytics />
        {/*
          Rendered only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set, so local and
          preview builds never write into the production property. One tag here
          covers both myautocore.com and app.myautocore.com — they are the same
          Next app — but GA4 still needs both listed under the stream's domain
          settings, or a visitor crossing between them looks like a new session
          from a referral and the ad that paid for them loses the credit.
        */}
        {isAnalyticsEnabled() ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
      </body>
    </html>
  );
}
