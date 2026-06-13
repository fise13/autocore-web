import { ReactNode } from "react";

import { RequireAppAccess } from "@/components/auth/require-app-access";
import { RequireAuth } from "@/components/auth/require-auth";
import { AuthJourneyCoordinator } from "@/components/auth/auth-journey-coordinator";
import { DashboardShell } from "@/components/layout/dashboard-shell";

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
