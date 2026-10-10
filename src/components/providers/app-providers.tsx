"use client";

import { LucideProvider } from "lucide-react";
import { ReactNode } from "react";

import { PaddleProvider } from "@/components/billing/paddle-provider";
import { PageTransitionProvider } from "@/components/motion/page-transition-provider";
import { WebVitalsReporter } from "@/components/performance/web-vitals-reporter";
import { AppContextMenuProvider } from "@/components/providers/app-context-menu-provider";
import { AppLocaleProvider } from "@/components/providers/app-locale-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { DesktopShellProvider } from "@/components/providers/desktop-shell-provider";
import { PerformanceTierProvider } from "@/components/providers/performance-tier-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="autocore-theme">
      <PerformanceTierProvider>
      <QueryProvider>
        <AuthProvider>
          <PaddleProvider>
          <AppLocaleProvider>
            <PageTransitionProvider>
              <WebVitalsReporter />
              {/* One stroke for every icon; see docs/AUTOCORE_DESIGN_LANGUAGE.md §5. */}
              <LucideProvider strokeWidth={1.75}>
              <ToastProvider>
                {/* Renders nothing on web; wires up the native menu, deep links
                    and window title when running in the desktop shell. */}
                <DesktopShellProvider />
                <AppContextMenuProvider>{children}</AppContextMenuProvider>
              </ToastProvider>
              </LucideProvider>
            </PageTransitionProvider>
          </AppLocaleProvider>
          </PaddleProvider>
        </AuthProvider>
      </QueryProvider>
      </PerformanceTierProvider>
    </ThemeProvider>
  );
}
