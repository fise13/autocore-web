"use client";

import { RequireAuth } from "@/components/auth/require-auth";

export default function DocumentsPrintLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
