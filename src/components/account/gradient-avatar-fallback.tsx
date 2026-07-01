"use client";

import type { CSSProperties, ReactNode } from "react";

import { AvatarFallback } from "@/components/ui/avatar";
import { userAvatarStyle } from "@/lib/user/user-avatar-style";
import { cn } from "@/lib/utils";

type GradientAvatarFallbackProps = {
  seed: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Avatar placeholder with a stable vibrant gradient (no photo). */
export function GradientAvatarFallback({
  seed,
  className,
  style,
  children,
}: GradientAvatarFallbackProps) {
  return (
    <AvatarFallback
      style={{ ...userAvatarStyle(seed), ...style }}
      className={cn("border-0 bg-transparent text-transparent", className)}
      aria-hidden={children ? undefined : true}
    >
      {children}
    </AvatarFallback>
  );
}
