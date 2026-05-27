"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnimatedUpgradeCtaProps = {
  children: ReactNode;
  animated?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  pending?: boolean;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
};

export function AnimatedUpgradeCta({
  children,
  animated = true,
  href,
  onClick,
  disabled,
  pending,
  size = "sm",
  variant = "default",
  className,
}: AnimatedUpgradeCtaProps) {
  const content = (
    <>
      {animated && variant === "default" ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 1.4 }}
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </span>
    </>
  );

  const sharedClass = cn(
    "relative overflow-hidden",
    buttonVariants({ variant, size }),
    className,
  );

  if (href) {
    return (
      <motion.span
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex shrink-0"
      >
        <Link href={href} className={sharedClass}>
          {content}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex">
      <Button type="button" variant={variant} size={size} disabled={disabled || pending} onClick={onClick} className={sharedClass}>
        {content}
      </Button>
    </motion.div>
  );
}
