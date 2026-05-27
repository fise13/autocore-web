import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { brandAssets } from "@/lib/brand-assets";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoCore",
  description: "Рабочее пространство AutoCore",
  icons: {
    icon: [
      { url: brandAssets.meta.favicon.src, sizes: "32x32", type: "image/png" },
      { url: brandAssets.meta.appleTouchIcon.src, sizes: "180x180", type: "image/png" },
    ],
    apple: brandAssets.meta.appleTouchIcon.src,
    shortcut: brandAssets.meta.favicon.src,
  },
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
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
