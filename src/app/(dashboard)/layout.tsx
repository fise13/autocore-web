import type { Metadata } from "next";
import { ReactNode } from "react";

import { RequireAppAccess } from "@/components/auth/require-app-access";
import { RequireAuth } from "@/components/auth/require-auth";
import { AuthJourneyCoordinator } from "@/components/auth/auth-journey-coordinator";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: {
    default: "AutoCore",
    template: "%s · AutoCore",
  },
  description: "Рабочее пространство AutoCore",
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RequireAuth>
      <AuthJourneyCoordinator>
        <RequireAppAccess>
          <DashboardShell>{children}</DashboardShell>
        </RequireAppAccess>
      </AuthJourneyCoordinator>
    </RequireAuth>
  );
}
