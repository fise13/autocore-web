import type { Metadata } from "next";
import { ReactNode } from "react";

import { AuthJourneyCoordinator } from "@/components/auth/auth-journey-coordinator";
import { RequireAppAccess } from "@/components/auth/require-app-access";
import { RequireAuth } from "@/components/auth/require-auth";
import { DomainDictionaryProvider } from "@/components/domain/domain-dictionary-provider";

export const metadata: Metadata = {
  title: "Перенос бизнеса",
  description: "Перенесите существующий бизнес в AutoCore из одного файла",
  robots: { index: false, follow: false },
};

/**
 * Business Migration is its own product surface, not a dashboard page.
 *
 * It reuses the app's auth gates and the Domain Dictionary (for suggestions and
 * continuous learning) but deliberately omits the DashboardShell — no sidebar,
 * no Motors/Warehouse/Accounting navigation. The migration owns the viewport.
 */
export default function MigrationLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AuthJourneyCoordinator>
        <RequireAppAccess>
          <DomainDictionaryProvider>{children}</DomainDictionaryProvider>
        </RequireAppAccess>
      </AuthJourneyCoordinator>
    </RequireAuth>
  );
}
