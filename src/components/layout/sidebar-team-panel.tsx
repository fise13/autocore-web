"use client";

import { usePathname } from "next/navigation";
import { UsersIcon } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { canViewEmployees } from "@/lib/auth/permissions";
import type { SidebarTeamPanelProps } from "@/lib/navigation/sidebar-types";
import { isSidebarNavActive } from "@/lib/navigation/sidebar-types";

export function SidebarTeamPanel({
  collapsed = false,
  onNavigate,
  linkAnimationIndex = 0,
}: SidebarTeamPanelProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const canView = canViewEmployees(profile);
  const teamActive =
    isSidebarNavActive(pathname, "/team") ||
    pathname === "/activity" ||
    pathname.startsWith("/activity/");

  if (collapsed || !canView) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Команда</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarNavLink
            href="/team"
            label="Команда"
            icon={UsersIcon}
            pathname={pathname}
            isActive={teamActive}
            collapsed={collapsed}
            onNavigate={onNavigate}
            animationIndex={linkAnimationIndex}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
