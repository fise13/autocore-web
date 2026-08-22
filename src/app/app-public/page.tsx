import type { Metadata } from "next";

import { AppPublicHome } from "@/components/app-public/app-public-home";

export const metadata: Metadata = {
  title: "AutoCore — workspace for auto businesses",
  description:
    "Cloud software for auto dismantlers, engine sellers, and repair shops: warehouse, work orders, documents, and team access.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function AppPublicPage() {
  return <AppPublicHome />;
}
