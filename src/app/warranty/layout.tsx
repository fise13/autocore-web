import type { ReactNode } from "react";

import { privateRouteMetadata } from "@/lib/seo/private-route-metadata";

export const metadata = privateRouteMetadata(
  "Warranty check",
  "Verify an AutoCore engine warranty.",
);

export default function WarrantyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
