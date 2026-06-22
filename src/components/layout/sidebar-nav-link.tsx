"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { usePerformanceTier } from "@/components/providers/performance-tier-provider";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { shouldPrefetchRoute } from "@/hooks/use-barba-navigation";
import {
  APP_SIDEBAR_ACTIVE_LAYOUT_ID,
  sidebarNavActiveSpring,
  sidebarNavItemEnterTransition,
} from "@/lib/motion/sidebar-nav-motion";
import { isSidebarNavActive } from "@/lib/navigation/sidebar-types";
import { cn } from "@/lib/utils";

export type SidebarNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
  isActive?: boolean;
  activeLayoutId?: string;
  animationIndex?: number;
  animateEnter?: boolean;
};

export const SidebarNavLink = memo(function SidebarNavLink({
  href,
  label,
  icon: Icon,
  pathname,
  collapsed = false,
  onNavigate,
  className,
  isActive: isActiveProp,
  activeLayoutId = APP_SIDEBAR_ACTIVE_LAYOUT_ID,
  animationIndex = 0,
  animateEnter = true,
}: SidebarNavLinkProps) {
  const router = useRouter();
  const { tier } = usePerformanceTier();
  const reduceMotion = useReducedMotion();
  const active = isActiveProp ?? isSidebarNavActive(pathname, href);
  const motionEnabled = !reduceMotion && tier !== "low";

  function navigate() {
    onNavigate?.();
    router.push(href);
  }

  function prefetch() {
    if (shouldPrefetchRoute(href, tier)) {
      router.prefetch(href);
    }
  }

  const button = (
    <SidebarMenuButton
      isActive={active}
      tooltip={collapsed ? label : undefined}
      onClick={navigate}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className={cn(
        "relative cursor-pointer",
        motionEnabled && active && "bg-transparent data-active:bg-transparent",
      )}
    >
      {motionEnabled && active ? (
        <motion.span
          layoutId={activeLayoutId}
          className="absolute inset-0 rounded-md bg-sidebar-accent shadow-sm"
          transition={sidebarNavActiveSpring}
        />
      ) : null}
      <Icon className="relative z-10 shrink-0" />
      <span className="relative z-10 truncate" data-sidebar-hide-collapsed>
        {label}
      </span>
    </SidebarMenuButton>
  );

  if (!motionEnabled || !animateEnter) {
    return <SidebarMenuItem className={className}>{button}</SidebarMenuItem>;
  }

  return (
    <motion.li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={sidebarNavItemEnterTransition(animationIndex)}
    >
      {button}
    </motion.li>
  );
});
