"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileText, LayoutGrid, Receipt } from "lucide-react";

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
import { createDataCleanupService } from "@/infrastructure/firestore/data-cleanup-service";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";

type CleanupActionId = "accounting" | "motors" | "specifics";

const cleanupService = createDataCleanupService();

type CleanupAction = {
  id: CleanupActionId;
  title: string;
  description: string;
  confirmTitle: string;
  confirmDescription: string;
  icon: typeof Receipt;
  canRun: boolean;
};

type DataCleanupPanelProps = {
  onStatus?: (message: string | null) => void;
};

export function DataCleanupPanel({ onStatus }: DataCleanupPanelProps) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const [pendingAction, setPendingAction] = useState<CleanupActionId | null>(null);
  const [busyAction, setBusyAction] = useState<CleanupActionId | null>(null);

  const actions = useMemo<CleanupAction[]>(
    () => [
      {
        id: "accounting",
        title: userCopy.settings.deleteAccountingTitle,
        description: userCopy.settings.deleteAccountingDescription,
        confirmTitle: userCopy.settings.deleteAccountingConfirmTitle,
        confirmDescription: userCopy.settings.deleteAccountingConfirmDescription,
        icon: Receipt,
        canRun: can(profile, "accounting_delete"),
      },
      {
        id: "motors",
        title: userCopy.settings.deleteMotorsTitle,
        description: userCopy.settings.deleteMotorsDescription,
        confirmTitle: userCopy.settings.deleteMotorsConfirmTitle,
        confirmDescription: userCopy.settings.deleteMotorsConfirmDescription,
        icon: LayoutGrid,
        canRun: can(profile, "inventory_delete"),
      },
      {
        id: "specifics",
        title: userCopy.settings.deleteSpecificsTitle,
        description: userCopy.settings.deleteSpecificsDescription,
        confirmTitle: userCopy.settings.deleteSpecificsConfirmTitle,
        confirmDescription: userCopy.settings.deleteSpecificsConfirmDescription,
        icon: FileText,
        canRun: can(profile, "inventory_delete"),
      },
    ],
    [profile],
  );

  const visibleActions = actions.filter((action) => action.canRun);
  const activeAction = visibleActions.find((action) => action.id === pendingAction) ?? null;

  if (visibleActions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{userCopy.settings.dataCleanup}</CardTitle>
          <CardDescription>{userCopy.settings.dataCleanupNoAccess}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function runCleanup(actionId: CleanupActionId) {
    if (!profile || !companyId || !uid) {
      onStatus?.("Компания не найдена");
      return;
    }

    setBusyAction(actionId);
    onStatus?.(null);
    try {
      let deleted = 0;
      switch (actionId) {
        case "accounting":
          deleted = await cleanupService.deleteAllAccounting(companyId, uid);
          onStatus?.(userCopy.settings.deleteAccountingSuccess(deleted));
          break;
        case "motors":
          deleted = await cleanupService.deleteAllMotors(uid, companyId, uid);
          onStatus?.(userCopy.settings.deleteMotorsSuccess(deleted));
          break;
        case "specifics":
          deleted = await cleanupService.deleteAllSpecifics(companyId, uid);
          onStatus?.(userCopy.settings.deleteSpecificsSuccess(deleted));
          break;
      }
      setPendingAction(null);
    } catch (error) {
      onStatus?.(
        error instanceof Error ? error.message : userCopy.settings.dataCleanupError,
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <CardTitle>{userCopy.settings.dataCleanup}</CardTitle>
          </div>
          <CardDescription>{userCopy.settings.dataCleanupDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                className="flex flex-col gap-3 rounded-lg border border-destructive/15 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-destructive" />
                    <p className="text-sm font-medium">{action.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busyAction != null}
                  onClick={() => setPendingAction(action.id)}
                >
                  {busyAction === action.id ? "Удаляем…" : "Удалить"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={activeAction != null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeAction?.confirmTitle}</DialogTitle>
            <DialogDescription>{activeAction?.confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busyAction != null}
              onClick={() => setPendingAction(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyAction != null || activeAction == null}
              onClick={() => activeAction && void runCleanup(activeAction.id)}
            >
              {busyAction != null ? "Удаляем…" : "Удалить безвозвратно"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
