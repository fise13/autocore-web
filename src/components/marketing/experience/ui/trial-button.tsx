"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  storePreferredLocale,
  withLangQuery,
  type AppLocale,
} from "@/lib/locale/preferred-locale";
import { appDemoUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

type DemoButtonProps = {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost";
};

/** Opens the live product demo — show the product, don't push purchase. */
export function TrialButton({
  children,
  className,
  size = "lg",
  variant = "default",
}: DemoButtonProps) {
  const locale = useLocale() as AppLocale;
  const onClick = useCallback(() => {
    storePreferredLocale(locale);
    window.location.href = withLangQuery(appDemoUrl(), locale);
  }, [locale]);

  return (
    <Button
      size={size}
      variant={variant}
      className={cn("h-10 min-w-[7.5rem] px-5 text-sm", className)}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
