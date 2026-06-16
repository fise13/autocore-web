"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import { useUserCompanies } from "@/hooks/use-user-companies";
import { companyAvatarGradient, companyMonogramLabel } from "@/lib/company/company-avatar-style";
import type { SidebarOrganizationSwitcherProps } from "@/lib/navigation/sidebar-types";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CompanyAvatarProps = {
  companyId: string;
  name: string;
  size?: "sm" | "md";
};

function CompanyAvatar({ companyId, name, size = "md" }: CompanyAvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br font-semibold text-white shadow-sm",
        companyAvatarGradient(companyId),
        size === "sm" ? "size-7 text-[10px]" : "size-8 text-xs",
      )}
    >
      {companyMonogramLabel(name)}
    </span>
  );
}

export function SidebarOrganizationSwitcher({ collapsed = false }: SidebarOrganizationSwitcherProps) {
  const { createCompany, switchCompany } = useAuth();
  const { companies, activeCompanyId, isLoading } = useUserCompanies();
  const [createOpen, setCreateOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCompany = useMemo(
    () => companies.find((company) => company.companyId === activeCompanyId) ?? companies[0] ?? null,
    [activeCompanyId, companies],
  );

  async function handleSwitch(companyId: string) {
    if (companyId === activeCompanyId) return;
    setBusy(true);
    setError(null);
    try {
      await switchCompany(companyId);
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Не удалось переключить компанию");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = companyName.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      await createCompany(trimmed);
      setCreateOpen(false);
      setCompanyName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Не удалось создать компанию");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton
              disabled={busy || isLoading}
              render={
                <button
                  type="button"
                  title={collapsed ? (activeCompany?.name ?? userCopy.appName) : undefined}
                  className={cn(
                    sidebarMenuButtonVariants({ size: "lg", variant: "outline" }),
                    "cursor-pointer data-[state=open]:bg-sidebar-accent",
                    collapsed && "justify-center",
                  )}
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
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Компании
                </DropdownMenuLabel>
                {companies.map((company) => {
                  const active = company.companyId === activeCompanyId;
                  return (
                    <DropdownMenuItem
                      key={company.companyId}
                      className="cursor-pointer gap-2 py-2"
                      onClick={() => void handleSwitch(company.companyId)}
                    >
                      <CompanyAvatar companyId={company.companyId} name={company.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{userCopy.billing.planFree}</p>
                      </div>
                      {active ? <Check className="shrink-0 text-foreground" /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => {
                    setError(null);
                    setCompanyName("");
                    setCreateOpen(true);
                  }}
                >
                  <Plus />
                  Создать компанию
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.company.createTitle}</DialogTitle>
            <DialogDescription>{userCopy.company.createDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleCreateCompany(event)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sidebar-new-company">{userCopy.company.companyNameLabel}</Label>
              <Input
                id="sidebar-new-company"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder={userCopy.company.companyNamePlaceholder}
                autoFocus
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button type="submit" disabled={busy || !companyName.trim()}>
                {userCopy.company.createButton}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
