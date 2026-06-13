"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

import {
  authJourneyEase,
  authJourneyReveal,
} from "@/lib/motion/auth-journey-motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

type AuthJourneyRevealProps = {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "section" | "p" | "h1" | "h2";
};

export function AuthJourneyReveal({
  children,
  index = 0,
  className,
  as = "div",
}: AuthJourneyRevealProps) {
  const reducedMotion = prefersReducedMotion();
  const Component = motion[as];

  return (
    <Component {...authJourneyReveal(index, reducedMotion)} className={className}>
      {children}
    </Component>
  );
}

type AuthJourneyStaggerGroupProps = {
  children: ReactNode;
  className?: string;
};

export function AuthJourneyStaggerGroup({ children, className }: AuthJourneyStaggerGroupProps) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}
