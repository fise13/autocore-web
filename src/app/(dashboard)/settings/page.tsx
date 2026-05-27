"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, Cloud, Download, Laptop, Workflow } from "lucide-react";

import { AccountSettingsPanel } from "@/components/account/account-settings-panel";
import { SubscriptionStrip } from "@/components/billing/subscription-strip";
import { CompanySettingsPanel } from "@/components/settings/company-settings-panel";
import { DataCleanupPanel } from "@/components/settings/data-cleanup-panel";
import { SettingsSectionId, SettingsShell } from "@/components/settings/settings-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { FadeIn } from "@/components/ui/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { userCopy } from "@/lib/user-copy";

function parseList(text: string): string[] {
  const values = text
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return values.filter((value, index) => values.findIndex((x) => x.toLowerCase() === value.toLowerCase()) === index);
}

function resolveSection(section: string | null): SettingsSectionId {
  switch (section) {
    case "account":
    case "company":
    case "accounting":
    case "sync":
    case "dataCleanup":
    case "macOnly":
      return section;
    case "billing":
      return "company";
    case "employees":
    case "roles":
      return "company";
    case "importExport":
      return "accounting";
    case "workflow":
      return "sync";
    default:
      return "account";
  }
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialSection = useMemo(
    () => resolveSection(searchParams.get("section")),
    [searchParams],
  );
  const showPlansInitially = searchParams.get("plans") === "1" || searchParams.get("section") === "billing";
  const initialTeamTab = searchParams.get("section") === "roles" ? "roles" : "employees";

  const { profile, ensureDefaultCompany } = useAuth();
  const { motorSyncState, triggerSync } = useWorkspace();
  const { requirePro, isPro } = useBillingGate();
  const [employeesDraft, setEmployeesDraft] = useState<string | null>(null);
  const [specificsDraft, setSpecificsDraft] = useState<string | null>(null);
  const [savingAccounting, setSavingAccounting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const uid = profile?.id ?? "";
  const { preferences, isLoading, savePreferences } = useUserPreferences(uid);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "canceled") {
      setStatus("Оплата отменена");
    }
  }, [searchParams]);

  const employeesValue = employeesDraft ?? preferences.employees.join("\n");
  const specificsValue = specificsDraft ?? preferences.specifics.join("\n");

  const syncBadge = useMemo(
    () =>
      preferences.syncEnabled ? (
        <Badge variant="outline">{userCopy.accounting.syncOn}</Badge>
      ) : (
        <Badge variant="secondary">{userCopy.accounting.syncOff}</Badge>
      ),
    [preferences.syncEnabled],
  );

  function renderSection(section: SettingsSectionId) {
    switch (section) {
      case "account":
        return (
          <FadeIn>
            <div className="space-y-5">
              <AccountSettingsPanel onStatus={setStatus} />
              <SubscriptionStrip />
            </div>
          </FadeIn>
        );
      case "company":
        return profile?.companyId ? (
          <CompanySettingsPanel
            companyId={profile.companyId}
            uid={uid}
            showPlansInitially={showPlansInitially}
            initialTeamTab={initialTeamTab}
            onStatus={setStatus}
          />
        ) : null;
      case "sync":
        return (
          <FadeIn>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Cloud className="size-4 text-primary" />
                    <CardTitle>{userCopy.settings.sync}</CardTitle>
                  </div>
                  <CardDescription>Статус синхронизации моторов и подключение к облаку.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/15 p-3 text-sm">
                    {motorSyncState.status === "syncing"
                      ? userCopy.sync.syncing
                      : motorSyncState.localDirty
                        ? userCopy.sync.localChanges
                        : motorSyncState.remotePending
                          ? userCopy.sync.remoteUpdates
                          : userCopy.sync.synced}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        requirePro("sync", async () => {
                          const synced = await triggerSync();
                          setStatus(
                            synced
                              ? "Синхронизация запущена"
                              : "Откройте «Моторы» или «Специфичные», чтобы синхронизировать изменения",
                          );
                        })
                      }
                    >
                      {userCopy.sync.syncNow}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        requirePro("cloud_sync", async () => {
                          await ensureDefaultCompany();
                          setStatus(`Подключено к «${userCopy.defaultCompanyName}»`);
                        })
                      }
                    >
                      {userCopy.company.connectButton}
                    </Button>
                    <Button
                      variant={preferences.motorSyncEnabled ? "default" : "outline"}
                      onClick={async () => {
                        await savePreferences({ motorSyncEnabled: !preferences.motorSyncEnabled });
                      }}
                    >
                      {preferences.motorSyncEnabled ? "Синхронизация моторов: вкл." : "Синхронизация моторов: выкл."}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Workflow className="size-4 text-primary" />
                  <CardTitle>{userCopy.settings.workflow}</CardTitle>
                  <CardDescription>Общие параметры поведения списка моторов.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    variant={preferences.workflow.autoSwitchToSold ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      savePreferences({
                        workflow: {
                          ...preferences.workflow,
                          autoSwitchToSold: !preferences.workflow.autoSwitchToSold,
                        },
                      })
                    }
                  >
                    Автопереход к проданным: {preferences.workflow.autoSwitchToSold ? "вкл." : "выкл."}
                  </Button>
                  <Button
                    variant={preferences.workflow.rememberBrand ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      savePreferences({
                        workflow: {
                          ...preferences.workflow,
                          rememberBrand: !preferences.workflow.rememberBrand,
                        },
                      })
                    }
                  >
                    Запоминать бренд: {preferences.workflow.rememberBrand ? "вкл." : "выкл."}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </FadeIn>
        );
      case "accounting":
        return (
          <FadeIn>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <CardTitle>{userCopy.settings.accounting}</CardTitle>
                  </div>
                  <CardDescription>Общие настройки бухгалтерии для Mac и браузера.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {syncBadge}
                    {isLoading ? <Badge variant="secondary">Загрузка…</Badge> : null}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      variant={preferences.syncEnabled ? "default" : "outline"}
                      onClick={async () => {
                        await savePreferences({ syncEnabled: true });
                        setStatus("Синхронизация бухгалтерии включена");
                      }}
                    >
                      Включить синхронизацию
                    </Button>
                    <Button
                      variant={!preferences.syncEnabled ? "default" : "outline"}
                      onClick={async () => {
                        await savePreferences({ syncEnabled: false });
                        setStatus("Синхронизация бухгалтерии отключена");
                      }}
                    >
                      Отключить синхронизацию
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Сотрудники</Label>
                      <textarea
                        value={employeesValue}
                        onChange={(event) => setEmployeesDraft(event.target.value)}
                        className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder={"Саня\nВалера"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Специфика бухгалтерии</Label>
                      <textarea
                        value={specificsValue}
                        onChange={(event) => setSpecificsDraft(event.target.value)}
                        className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder={"аванс\nлогистика"}
                      />
                    </div>
                  </div>
                  <Button
                    disabled={savingAccounting || isLoading || !uid}
                    onClick={async () => {
                      setSavingAccounting(true);
                      setStatus(null);
                      try {
                        const employees = parseList(employeesValue);
                        const specifics = parseList(specificsValue);
                        await savePreferences({ employees, specifics, isConfigured: true });
                        setEmployeesDraft(null);
                        setSpecificsDraft(null);
                        setStatus("Настройки бухгалтерии сохранены в облаке");
                      } catch (error) {
                        setStatus(
                          error instanceof Error
                            ? error.message
                            : "Не удалось сохранить настройки бухгалтерии",
                        );
                      } finally {
                        setSavingAccounting(false);
                      }
                    }}
                  >
                    {savingAccounting ? "Сохраняем…" : "Сохранить настройки бухгалтерии"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Download className="size-4 text-primary" />
                  <CardTitle>{userCopy.settings.importExport}</CardTitle>
                  <CardDescription>
                    {isPro
                      ? "Параметры импорта и экспорта, общие для всех устройств."
                      : userCopy.billing.paywall.export.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    При конфликте:{" "}
                    {preferences.importExport.conflictBehavior === "keepLocal"
                      ? "сохранять локальные изменения"
                      : "предпочитать облако"}
                  </p>
                  <p>Формат даты экспорта: {preferences.importExport.exportDateFormat}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        savePreferences({
                          importExport: {
                            ...preferences.importExport,
                            conflictBehavior:
                              preferences.importExport.conflictBehavior === "keepLocal"
                                ? "preferCloud"
                                : "keepLocal",
                          },
                        })
                      }
                    >
                      Переключить поведение конфликтов
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FadeIn>
        );
      case "dataCleanup":
        return (
          <FadeIn>
            <DataCleanupPanel onStatus={setStatus} />
          </FadeIn>
        );
      case "macOnly":
        return (
          <FadeIn>
            <Card>
              <CardHeader>
                <Laptop className="size-4 text-primary" />
                <CardTitle>{userCopy.settings.macOnly}</CardTitle>
                <CardDescription>{userCopy.settings.macOnlyHint}</CardDescription>
              </CardHeader>
            </Card>
          </FadeIn>
        );
      default:
        return null;
    }
  }

  return (
    <SettingsShell key={initialSection} initialSection={initialSection}>
      {(section) => (
        <>
          {renderSection(section)}
          {status ? (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
              {status}
            </p>
          ) : null}
        </>
      )}
    </SettingsShell>
  );
}
