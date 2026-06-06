import { ReactNode } from "react";

import { RequireAppAccess } from "@/components/auth/require-app-access";
import { RequireAuth } from "@/components/auth/require-auth";
import { CompanyGate } from "@/components/company/company-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RequireAuth>
      <CompanyGate>
        <RequireAppAccess>
          <DashboardShell>{children}</DashboardShell>
        </RequireAppAccess>
      </CompanyGate>
    </RequireAuth>
  );
}
