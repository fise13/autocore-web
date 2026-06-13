"use client";

import { ReactNode } from "react";

import { PageTransitionProvider } from "@/components/motion/page-transition-provider";
import { WebVitalsReporter } from "@/components/performance/web-vitals-reporter";
import { AuthProvider } from "@/components/providers/auth-provider";
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
          <PageTransitionProvider>
            <WebVitalsReporter />
            <ToastProvider>{children}</ToastProvider>
          </PageTransitionProvider>
        </AuthProvider>
      </QueryProvider>
      </PerformanceTierProvider>
    </ThemeProvider>
  );
}
