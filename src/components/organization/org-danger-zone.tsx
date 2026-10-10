"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, LoaderCircle, LogOut, Trash2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type OrgDangerZoneProps = {
  companyId: string;
  companyName: string;
  isOwner: boolean;
};

type DangerActionRowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  tone?: "default" | "destructive";
  disabled?: boolean;
};

function DangerActionRow({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "default",
  disabled = false,
}: DangerActionRowProps) {
  const destructive = tone === "destructive";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        destructive
          ? "border-destructive/25 bg-destructive/[0.06] hover:bg-destructive/[0.09]"
          : "border-border/70 bg-background/40 hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
          destructive
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-border/70 bg-muted/40 text-muted-foreground",
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <Button
        type="button"
        size="sm"
        variant={destructive ? "destructive" : "outline"}
        disabled={disabled}
        className={cn(
          "mt-0.5 shrink-0",
          destructive &&
            "border-transparent bg-destructive text-white shadow-sm hover:bg-destructive/90 dark:text-white",
        )}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

type LeaveApiError = {
  error?: string;
  code?: string;
  title?: string;
};

export function OrgDangerZone({ companyId, companyName, isOwner }: OrgDangerZoneProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soleOwnerBlocked, setSoleOwnerBlocked] = useState(false);

  async function authFetch(path: string, body: Record<string, unknown>) {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    if (!token) throw new Error(userCopy.organization.danger.authRequired);
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as LeaveApiError;
    if (!response.ok) {
      const err = new Error(payload.error ?? userCopy.organization.danger.actionFailed) as Error & {
        code?: string;
      };
      err.code = typeof payload.code === "string" ? payload.code : undefined;
      throw err;
    }
    return payload;
  }

  function openDeleteFromLeave() {
    setLeaveOpen(false);
    setSoleOwnerBlocked(false);
    setError(null);
    setConfirmName("");
    setDeleteOpen(true);
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    setSoleOwnerBlocked(false);
    try {
      await authFetch("/api/org/leave", { companyId });
      setLeaveOpen(false);
      await refreshProfile();
      router.refresh();
      router.replace("/home");
    } catch (e) {
      const code = e instanceof Error && "code" in e ? String((e as Error & { code?: string }).code ?? "") : "";
      if (code === "sole_owner_cannot_leave" || code === "owner_cannot_leave") {
        setSoleOwnerBlocked(true);
        setError(userCopy.organization.danger.soleOwnerLeaveHint);
      } else {
        setError(e instanceof Error ? e.message : userCopy.organization.danger.errorGeneric);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authFetch("/api/org/delete", { companyId, confirmationName: confirmName });
      setDeleteOpen(false);
      await refreshProfile();
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : userCopy.organization.danger.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/20 bg-destructive/[0.03] shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <span className="flex size-7 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10">
            <TriangleAlert className="size-3.5" />
          </span>
          {userCopy.organization.danger.title}
        </CardTitle>
        <CardDescription>{userCopy.organization.danger.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <DangerActionRow
          icon={<LogOut className="size-4" />}
          title={userCopy.organization.danger.leaveTitle}
          description={
            isOwner
              ? userCopy.organization.danger.leaveOwnerDescription(companyName)
              : userCopy.organization.danger.leaveDescription(companyName)
          }
          actionLabel={userCopy.organization.danger.leaveAction}
          onAction={() => {
            setError(null);
            setSoleOwnerBlocked(false);
            setLeaveOpen(true);
          }}
        />
        {isOwner ? (
          <DangerActionRow
            icon={<Trash2 className="size-4" />}
            title={userCopy.organization.danger.deleteTitle}
            description={userCopy.organization.danger.deleteDescription}
            actionLabel={userCopy.organization.danger.deleteAction}
            tone="destructive"
            onAction={() => {
              setError(null);
              setSoleOwnerBlocked(false);
              setConfirmName("");
              setDeleteOpen(true);
            }}
          />
        ) : null}
      </CardContent>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userCopy.organization.danger.leaveConfirmTitle}</DialogTitle>
            <DialogDescription>
              {isOwner
                ? userCopy.organization.danger.leaveOwnerConfirmBody(companyName)
                : userCopy.organization.danger.leaveConfirmBody(companyName)}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              {userCopy.organization.danger.cancel}
            </Button>
            {soleOwnerBlocked && isOwner ? (
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={openDeleteFromLeave}
              >
                {userCopy.organization.danger.deleteAction}
              </Button>
            ) : (
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => void handleLeave()}
                disabled={busy}
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : userCopy.organization.danger.leaveAction}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userCopy.organization.danger.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {userCopy.organization.danger.deleteConfirmBody(companyName)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleDelete(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-name">{userCopy.organization.danger.confirmNameLabel}</Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={companyName}
                autoComplete="off"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
                {userCopy.organization.danger.cancel}
              </Button>
              <Button
                type="submit"
                className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                disabled={busy || confirmName.trim() !== companyName}
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : userCopy.organization.danger.deleteForever}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
