"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Plus, Users } from "lucide-react";
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
import { parseInviteTokenFromPath } from "@autocore/org";

type CompanyAvatarProps = {
  companyId: string;
  name: string;
  size?: "sm" | "md" | "rail";
};

export function CompanyAvatar({ companyId, name, size = "md" }: CompanyAvatarProps) {
  return (
    <span
      style={companyAvatarStyle(companyId)}
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold leading-none text-white shadow-sm ring-1 ring-white/15",
        size === "sm" && "size-8 rounded-lg text-micro",
        size === "md" && "size-8 rounded-lg text-xs",
        size === "rail" && "size-9 rounded-[0.7rem] text-micro tracking-wide shadow-md ring-black/10",
      )}
    >
      {companyMonogramLabel(name)}
    </span>
  );
}

const plainItemClassName =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm leading-none transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

const dropdownRowClassName =
  "cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2";

type CompanySwitcherMenuProps = {
  onClose?: () => void;
  variant?: "dropdown" | "plain";
  onOpenCreateDialog?: () => void;
  onOpenJoinDialog?: () => void;
};

export function CompanySwitcherMenu({
  onClose,
  variant = "dropdown",
  onOpenCreateDialog,
  onOpenJoinDialog,
}: CompanySwitcherMenuProps) {
  const router = useRouter();
  const { switchCompany } = useAuth();
  const { companies, activeCompanyId, isLoading, isSyncing } = useUserCompanies();
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
      setError(
        switchError instanceof Error ? switchError.message : userCopy.layout.switchCompanyFailed,
      );
    } finally {
      setBusy(false);
    }
  }

  const companyRows = isLoading ? (
    variant === "dropdown" ? (
      <DropdownMenuItem disabled className="text-muted-foreground">
        {userCopy.layout.loading}
      </DropdownMenuItem>
    ) : (
      <p className="px-2 py-2 text-sm text-muted-foreground">{userCopy.layout.loading}</p>
    )
  ) : companies.length === 0 ? (
    variant === "dropdown" ? (
      <DropdownMenuItem disabled className={dropdownRowClassName}>
        <AppLogo size={32} className="rounded-lg" alt={userCopy.appName} />
        <div className="min-w-0 flex-1 leading-none">
          <p className="truncate text-sm font-medium">{userCopy.appName}</p>
          <p className="mt-1 text-micro text-muted-foreground">{userCopy.layout.noCompanies}</p>
        </div>
      </DropdownMenuItem>
    ) : (
      <div className={cn(plainItemClassName, "cursor-default hover:bg-transparent")}>
        <AppLogo size={32} className="rounded-lg" alt={userCopy.appName} />
        <div className="min-w-0 flex-1 leading-none">
          <p className="truncate text-sm font-medium">{userCopy.appName}</p>
          <p className="mt-1 text-micro text-muted-foreground">{userCopy.layout.noCompanies}</p>
        </div>
      </div>
    )
  ) : (
    companies.map((company) => {
      const active = company.companyId === activeCompanyId;
      const content = (
        <>
          <CompanyAvatar companyId={company.companyId} name={company.name} size="md" />
          <div className="min-w-0 flex-1 leading-none">
            <p className="truncate text-sm font-medium">{company.name}</p>
            <CompanyPlanLabel
              companyId={company.companyId}
              isActiveCompany={active}
              className="mt-1 text-micro"
            />
          </div>
          {active ? <Check className="size-4 shrink-0 text-foreground" /> : null}
        </>
      );

      if (variant === "dropdown") {
        return (
          <DropdownMenuItem
            key={company.companyId}
            className={dropdownRowClassName}
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

  const joinAction =
    variant === "dropdown" ? (
      <DropdownMenuItem
        className={dropdownRowClassName}
        disabled={busy}
        onClick={() => onOpenJoinDialog?.()}
      >
        <Users className="size-4 text-muted-foreground" />
        <span className="leading-none">{userCopy.layout.joinCompany}</span>
      </DropdownMenuItem>
    ) : (
      <button
        type="button"
        className={plainItemClassName}
        disabled={busy}
        onClick={() => onOpenJoinDialog?.()}
      >
        <Users className="size-4 text-muted-foreground" />
        <span className="leading-none">{userCopy.layout.joinCompany}</span>
      </button>
    );

  const createAction =
    variant === "dropdown" ? (
      <DropdownMenuItem
        className={dropdownRowClassName}
        disabled={busy}
        onClick={() => onOpenCreateDialog?.()}
      >
        <Plus className="size-4 text-muted-foreground" />
        <span className="leading-none">{userCopy.layout.createCompany}</span>
      </DropdownMenuItem>
    ) : (
      <button
        type="button"
        className={plainItemClassName}
        disabled={busy}
        onClick={() => onOpenCreateDialog?.()}
      >
        <Plus className="size-4 text-muted-foreground" />
        <span className="leading-none">{userCopy.layout.createCompany}</span>
      </button>
    );

  const menuBody =
    variant === "dropdown" ? (
      <>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pt-1.5 pb-2 text-micro font-medium text-muted-foreground">
            {userCopy.layout.companies}
            {isSyncing && companies.length > 0 ? (
              <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">
                · {userCopy.layout.updating}
              </span>
            ) : null}
          </DropdownMenuLabel>
          {companyRows}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuGroup>
          {joinAction}
          {createAction}
        </DropdownMenuGroup>
      </>
    ) : (
      <>
        <p className="px-2 pt-1.5 pb-2 text-micro font-medium text-muted-foreground">
          {userCopy.layout.companies}
        </p>
        {companyRows}
        <div className="my-1.5 h-px bg-border/70" />
        {joinAction}
        {createAction}
      </>
    );

  return (
    <>
      {menuBody}
      {error ? (
        <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>
      ) : null}
    </>
  );
}

type CreateCompanyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCompanyDialogProps) {
  const router = useRouter();
  const { createCompany } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = companyName.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      await createCompany(trimmed);
      setCompanyName("");
      onOpenChange(false);
      onCreated?.();
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : userCopy.layout.createCompanyFailed,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCompanyName("");
          setError(null);
        }
        onOpenChange(nextOpen);
      }}
    >
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
              name="autocore-new-company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder={userCopy.company.companyNamePlaceholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {userCopy.layout.cancel}
            </Button>
            <Button type="submit" disabled={busy || !companyName.trim()}>
              {userCopy.company.createButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseInviteInput(raw: string): { type: "token"; token: string } | { type: "code"; code: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { type: "code", code: "" };

  const fromPath = parseInviteTokenFromPath(trimmed);
  if (fromPath) return { type: "token", token: fromPath };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromUrl = parseInviteTokenFromPath(`${url.pathname}${url.search}`);
      if (fromUrl) return { type: "token", token: fromUrl };
    } catch {
      // Fall through to invite code.
    }
  }

  return { type: "code", code: trimmed };
}

type JoinCompanyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: () => void;
};

export function JoinCompanyDialog({ open, onOpenChange, onJoined }: JoinCompanyDialogProps) {
  const router = useRouter();
  const { joinCompanyWithInvite } = useAuth();
  const [inviteInput, setInviteInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoinCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseInviteInput(inviteInput);
    if (parsed.type === "code" && !parsed.code) return;

    setBusy(true);
    setError(null);
    try {
      if (parsed.type === "token") {
        onOpenChange(false);
        setInviteInput("");
        router.push(`/invite/${encodeURIComponent(parsed.token)}`);
        return;
      }

      await joinCompanyWithInvite(parsed.code);
      setInviteInput("");
      onOpenChange(false);
      onJoined?.();
      router.refresh();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : userCopy.layout.joinCompanyFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setInviteInput("");
          setError(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{userCopy.company.inviteTitle}</DialogTitle>
          <DialogDescription>{userCopy.layout.joinHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleJoinCompany(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-switcher-join-invite">{userCopy.company.inviteLabel}</Label>
            <Input
              id="company-switcher-join-invite"
              value={inviteInput}
              onChange={(event) => setInviteInput(event.target.value)}
              placeholder={userCopy.layout.joinPlaceholder}
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {userCopy.layout.cancel}
            </Button>
            <Button type="submit" disabled={busy || !inviteInput.trim()}>
              {userCopy.layout.join}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
