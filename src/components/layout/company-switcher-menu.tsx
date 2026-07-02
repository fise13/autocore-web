"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppLogo } from "@/components/brand/app-logo";
import { CompanyPlanLabel } from "@/components/billing/company-plan-label";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserCompanies } from "@/hooks/use-user-companies";
import { companyAvatarStyle, companyMonogramLabel } from "@/lib/company/company-avatar-style";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CompanyAvatarProps = {
  companyId: string;
  name: string;
  size?: "sm" | "md";
};

export function CompanyAvatar({ companyId, name, size = "md" }: CompanyAvatarProps) {
  return (
    <span
      style={companyAvatarStyle(companyId)}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-semibold text-white shadow-sm ring-1 ring-white/10",
        size === "sm" ? "size-7 text-[10px]" : "size-8 text-xs",
      )}
    >
      {companyMonogramLabel(name)}
    </span>
  );
}

const plainItemClassName =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

type CompanySwitcherMenuProps = {
  onClose?: () => void;
  variant?: "dropdown" | "plain";
};

export function CompanySwitcherMenu({ onClose, variant = "dropdown" }: CompanySwitcherMenuProps) {
  const router = useRouter();
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
    if (companyId === activeCompanyId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await switchCompany(companyId);
      onClose?.();
      router.refresh();
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
      onClose?.();
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Не удалось создать компанию");
    } finally {
      setBusy(false);
    }
  }

  function openCreateDialog() {
    setError(null);
    setCompanyName("");
    setCreateOpen(true);
  }

  const companyRows = isLoading ? (
    variant === "dropdown" ? (
      <DropdownMenuItem disabled className="text-muted-foreground">
        Загрузка…
      </DropdownMenuItem>
    ) : (
      <p className="px-2 py-2 text-sm text-muted-foreground">Загрузка…</p>
    )
  ) : companies.length === 0 ? (
    variant === "dropdown" ? (
      <DropdownMenuItem disabled className="gap-2 py-2">
        <AppLogo size={28} className="rounded-md" alt={userCopy.appName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{userCopy.appName}</p>
          <p className="text-xs text-muted-foreground">Нет доступных компаний</p>
        </div>
      </DropdownMenuItem>
    ) : (
      <div className={cn(plainItemClassName, "cursor-default hover:bg-transparent")}>
        <AppLogo size={28} className="rounded-md" alt={userCopy.appName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{userCopy.appName}</p>
          <p className="text-xs text-muted-foreground">Нет доступных компаний</p>
        </div>
      </div>
    )
  ) : (
    companies.map((company) => {
      const active = company.companyId === activeCompanyId;
      const content = (
        <>
          <CompanyAvatar companyId={company.companyId} name={company.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{company.name}</p>
            <CompanyPlanLabel isActiveCompany={active} />
          </div>
          {active ? <Check className="shrink-0 text-foreground" /> : null}
        </>
      );

      if (variant === "dropdown") {
        return (
          <DropdownMenuItem
            key={company.companyId}
            className="cursor-pointer gap-2 py-2"
            disabled={busy}
            onClick={() => void handleSwitch(company.companyId)}
          >
            {content}
          </DropdownMenuItem>
        );
      }

      return (
        <button
          key={company.companyId}
          type="button"
          className={plainItemClassName}
          disabled={busy}
          onClick={() => void handleSwitch(company.companyId)}
        >
          {content}
        </button>
      );
    })
  );

  const createAction =
    variant === "dropdown" ? (
      <DropdownMenuItem className="cursor-pointer gap-2" disabled={busy} onClick={openCreateDialog}>
        <Plus />
        Создать компанию
      </DropdownMenuItem>
    ) : (
      <button type="button" className={plainItemClassName} disabled={busy} onClick={openCreateDialog}>
        <Plus className="size-4 text-muted-foreground" />
        Создать компанию
      </button>
    );

  const menuBody =
    variant === "dropdown" ? (
      <>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Компании
          </DropdownMenuLabel>
          {companyRows}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>{createAction}</DropdownMenuGroup>
      </>
    ) : (
      <>
        <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Компании
        </p>
        {companyRows}
        <div className="my-1 h-px bg-border/70" />
        {createAction}
      </>
    );

  return (
    <>
      {menuBody}
      {error && !createOpen ? (
        <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.company.createTitle}</DialogTitle>
            <DialogDescription>{userCopy.company.createDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleCreateCompany(event)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-switcher-new-company">{userCopy.company.companyNameLabel}</Label>
              <Input
                id="company-switcher-new-company"
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
