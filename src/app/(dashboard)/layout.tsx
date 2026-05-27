import { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { CompanyGate } from "@/components/company/company-gate";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RequireAuth>
      <CompanyGate>
        <OnboardingGate>
          <DashboardShell>{children}</DashboardShell>
        </OnboardingGate>
      </CompanyGate>
    </RequireAuth>
  );
}
