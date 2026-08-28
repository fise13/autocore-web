import type { Metadata } from "next";

import { AppPublicHome } from "@/components/app-public/app-public-home";
import { getMarketingUrl } from "@/lib/site-urls";

/**
 * The app host's root. Middleware rewrites `app.myautocore.com/` here so the
 * payment provider, crawlers, and signed-out visitors always reach a public
 * page.
 *
 * It stays crawlable, but it must not compete with the marketing homepage: the
 * two say the same thing on two hostnames, which is a textbook duplicate that
 * splits the brand query between them. The cross-domain canonical points the
 * consolidation at the marketing home, which is the page actually built to rank.
 */
export const metadata: Metadata = {
  title: "AutoCore — workspace for auto businesses",
  description:
    "Cloud software for auto dismantlers, engine sellers, and repair shops: warehouse, work orders, documents, and team access.",
  alternates: {
    canonical: `${getMarketingUrl().replace(/\/$/, "")}/`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AppPublicPage() {
  return <AppPublicHome />;
}
