"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import {
  CompanyAvatar,
  CreateCompanyDialog,
  CompanySwitcherMenu,
  JoinCompanyDialog,
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
  const canOpenSwitcher = companies.length > 0 || !isLoading;
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const activeCompany = useMemo(
    () => companies.find((company) => company.companyId === activeCompanyId) ?? companies[0] ?? null,
    [activeCompanyId, companies],
  );

  const tooltipLabel = activeCompany?.name ?? userCopy.appName;

  return (
    <SidebarMenu className={cn(collapsed && "w-auto items-center")}>
      <SidebarMenuItem className={cn(collapsed && "flex w-auto justify-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!canOpenSwitcher}
            title={collapsed ? tooltipLabel : undefined}
            aria-label={collapsed ? tooltipLabel : undefined}
            render={
              <SidebarMenuButton
                size={collapsed ? "default" : "lg"}
                variant={collapsed ? "default" : "outline"}
                data-org-switcher=""
                className={cn(
                  "cursor-pointer data-[state=open]:bg-sidebar-accent",
                  collapsed
                    ? [
                        "relative size-9! w-9! max-w-9 shrink-0 justify-center overflow-visible rounded-lg p-0!",
                        "hover:bg-sidebar-accent/70 data-[state=open]:ring-2 data-[state=open]:ring-primary/25",
                        "[&>span]:max-w-none [&>span]:overflow-visible [&>span]:whitespace-normal",
                      ]
                    : "h-11 gap-2.5 px-2 py-1.5",
                )}
              />
            }
          >
            {collapsed ? (
              <>
                {activeCompany ? (
                  <CompanyAvatar
                    companyId={activeCompany.companyId}
                    name={activeCompany.name}
                    size="rail"
                  />
                ) : (
                  <AppLogo size={36} className="rounded-[0.7rem] shadow-sm" alt={userCopy.appName} />
                )}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-sm [&_svg]:size-2!"
                >
                  <ChevronsUpDown strokeWidth={2.5} />
                </span>
              </>
            ) : (
              <>
                {activeCompany ? (
                  <CompanyAvatar
                    companyId={activeCompany.companyId}
                    name={activeCompany.name}
                    size="md"
                  />
                ) : (
                  <AppLogo size={32} className="rounded-lg" alt={userCopy.appName} />
                )}
                <div className="min-w-0 flex-1 text-left leading-none">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {activeCompany?.name ?? userCopy.appName}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {companies.length}{" "}
                    {companies.length === 1 ? "пространство" : "пространства"}
                  </p>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={collapsed ? "right" : "bottom"}
            align="start"
            sideOffset={collapsed ? 10 : 6}
            className="w-64 p-1.5"
          >
            <CompanySwitcherMenu
              onOpenCreateDialog={() => setCreateOpen(true)}
              onOpenJoinDialog={() => setJoinOpen(true)}
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
        <JoinCompanyDialog open={joinOpen} onOpenChange={setJoinOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
