"use client";

import { ReactNode } from "react";

import { PageTransitionProvider } from "@/components/motion/page-transition-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="autocore-theme">
      <QueryProvider>
        <AuthProvider>
          <PageTransitionProvider>
            <ToastProvider>{children}</ToastProvider>
          </PageTransitionProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
