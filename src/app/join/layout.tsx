import type { ReactNode } from "react";

import { privateRouteMetadata } from "@/lib/seo/private-route-metadata";

export const metadata = privateRouteMetadata(
  "Join a workspace",
  "Accept an AutoCore workspace invitation.",
);

export default function JoinLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
