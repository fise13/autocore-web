import type { ReactNode } from "react";

import { privateRouteMetadata } from "@/lib/seo/private-route-metadata";

export const metadata = privateRouteMetadata(
  "Workspace invitation",
  "Accept an AutoCore workspace invitation.",
);

export default function InviteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
