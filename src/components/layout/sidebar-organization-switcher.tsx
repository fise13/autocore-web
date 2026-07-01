"use client";

import { useMemo } from "react";
import { ChevronsUpDown } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import {
  CompanyAvatar,
  CompanySwitcherMenu,
} from "@/components/layout/company-switcher-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUserCompanies } from "@/hooks/use-user-companies";
import type { SidebarOrganizationSwitcherProps } from "@/lib/navigation/sidebar-types";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export function SidebarOrganizationSwitcher({ collapsed = false }: SidebarOrganizationSwitcherProps) {
  const { companies, activeCompanyId, isLoading } = useUserCompanies();

  const activeCompany = useMemo(
    () => companies.find((company) => company.companyId === activeCompanyId) ?? companies[0] ?? null,
    [activeCompanyId, companies],
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isLoading}
            render={
              <SidebarMenuButton
                size={collapsed ? "default" : "lg"}
                variant={collapsed ? "default" : "outline"}
                className={cn(
                  "cursor-pointer data-[state=open]:bg-sidebar-accent",
                  collapsed && "size-8! justify-center p-0!",
                )}
                tooltip={collapsed ? (activeCompany?.name ?? userCopy.appName) : undefined}
              />
            }
          >
            {activeCompany ? (
              <CompanyAvatar
                companyId={activeCompany.companyId}
                name={activeCompany.name}
                size={collapsed ? "sm" : "md"}
              />
            ) : (
              <AppLogo size={collapsed ? 28 : 24} className="rounded-md" alt={userCopy.appName} />
            )}
            {!collapsed ? (
              <>
                <div data-sidebar-hide-collapsed className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold tracking-tight">
                    {activeCompany?.name ?? userCopy.appName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {companies.length}{" "}
                    {companies.length === 1 ? "пространство" : "пространства"}
                  </p>
                </div>
                <ChevronsUpDown data-sidebar-hide-collapsed className="text-muted-foreground" />
              </>
            ) : null}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={collapsed ? "right" : "bottom"}
            align="start"
            className="w-64"
          >
            <CompanySwitcherMenu />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
