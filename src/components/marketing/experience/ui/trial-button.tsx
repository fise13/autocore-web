"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
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
  const onClick = useCallback(() => {
    window.location.href = appDemoUrl();
  }, []);

  return (
    <Button size={size} variant={variant} className={cn("h-10 min-w-[11rem] px-5 text-sm", className)} onClick={onClick}>
      {children}
    </Button>
  );
}
