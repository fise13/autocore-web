"use client";

import { usePathname, useRouter } from "next/navigation";
import { FileTextIcon } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { can, canManageSettings } from "@/lib/auth/permissions";
import type { SidebarDocumentsPanelProps } from "@/lib/navigation/sidebar-types";

export function SidebarDocumentsPanel({
  collapsed = false,
  onNavigate,
  linkAnimationIndex = 0,
}: SidebarDocumentsPanelProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const canShow =
    canManageSettings(profile) || can(profile, "work_orders_view") || can(profile, "accounting_view");

  if (collapsed || !canShow) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Документы</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarNavLink
            href="/documents"
            label="Документы"
            icon={FileTextIcon}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
            animationIndex={linkAnimationIndex}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
