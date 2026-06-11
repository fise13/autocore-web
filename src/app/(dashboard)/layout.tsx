import { ReactNode } from "react";

import { RequireAppAccess } from "@/components/auth/require-app-access";
import { RequireAuth } from "@/components/auth/require-auth";
import { ProfileNameGate } from "@/components/auth/profile-name-gate";
import { CompanyGate } from "@/components/company/company-gate";
import { SetupWizardGate } from "@/components/onboarding/setup-wizard-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RequireAuth>
      <ProfileNameGate>
        <CompanyGate>
          <SetupWizardGate>
            <RequireAppAccess>
              <DashboardShell>{children}</DashboardShell>
            </RequireAppAccess>
          </SetupWizardGate>
        </CompanyGate>
      </ProfileNameGate>
    </RequireAuth>
  );
}
