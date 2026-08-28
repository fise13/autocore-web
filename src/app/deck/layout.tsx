import type { ReactNode } from "react";

import { privateRouteMetadata } from "@/lib/seo/private-route-metadata";

export const metadata = privateRouteMetadata(
  "AutoCore",
  "AutoCore access.",
);

export default function DeckLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
