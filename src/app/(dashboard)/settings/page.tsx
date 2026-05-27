"use client";

import { doc, updateDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Cloud, Download, Laptop, Workflow } from "lucide-react";

import { AccountSettingsPanel } from "@/components/account/account-settings-panel";
import { EmployeesWorkspace } from "@/components/employees/employees-workspace";
import { RolesWorkspace } from "@/components/employees/roles-workspace";
import { DataCleanupPanel } from "@/components/settings/data-cleanup-panel";
import { SettingsSectionId, SettingsShell } from "@/components/settings/settings-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { FadeIn } from "@/components/ui/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { userCopy } from "@/lib/user-copy";

function parseList(text: string): string[] {
  const values = text
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return values.filter((value, index) => values.findIndex((x) => x.toLowerCase() === value.toLowerCase()) === index);
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialSection = useMemo(() => {
    const section = searchParams.get("section");
    if (
      section === "account" ||
      section === "employees" ||
      section === "roles" ||
      section === "accounting" ||
      section === "sync" ||
      section === "importExport" ||
      section === "workflow" ||
      section === "dataCleanup" ||
      section === "macOnly"
    ) {
      return section;
    }
    return "account" satisfies SettingsSectionId;
  }, [searchParams]);

  const { profile, refreshProfile, ensureDefaultCompany } = useAuth();
  const { motorSyncState, triggerSync } = useWorkspace();
  const [companyName, setCompanyName] = useState("");
  const [employeesDraft, setEmployeesDraft] = useState<string | null>(null);
  const [specificsDraft, setSpecificsDraft] = useState<string | null>(null);
  const [savingAccounting, setSavingAccounting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const uid = profile?.id ?? "";
  const { preferences, isLoading, savePreferences } = useUserPreferences(uid);

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

  async function updateCompanyName() {
    if (!profile?.companyId || !companyName.trim()) return;
    const db = getFirestoreDb();
    await updateDoc(doc(db, "companies", profile.companyId), {
      name: companyName.trim(),
    });
    setCompanyName("");
    setStatus("Название компании обновлено");
    await refreshProfile();
  }

  function renderSection(section: SettingsSectionId) {
    switch (section) {
      case "account":
        return (
          <FadeIn>
            <AccountSettingsPanel onStatus={setStatus} />
          </FadeIn>
        );
      case "employees":
        return (
          <FadeIn>
            <EmployeesWorkspace />
          </FadeIn>
        );
      case "roles":
        return (
          <FadeIn>
            <RolesWorkspace />
          </FadeIn>
        );
      case "sync":
        return (
          <FadeIn>
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
                    onClick={async () => {
                      const synced = await triggerSync();
                      setStatus(
                        synced
                          ? "Синхронизация запущена"
                          : "Откройте «Моторы» или «Специфичные», чтобы синхронизировать изменения",
                      );
                    }}
                  >
                    {userCopy.sync.syncNow}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await ensureDefaultCompany();
                      setStatus(`Подключено к «${userCopy.defaultCompanyName}»`);
                    }}
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
          </FadeIn>
        );
      case "accounting":
        return (
          <FadeIn>
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
          </FadeIn>
        );
      case "importExport":
        return (
          <FadeIn>
            <Card>
              <CardHeader>
                <Download className="size-4 text-primary" />
                <CardTitle>{userCopy.settings.importExport}</CardTitle>
                <CardDescription>Параметры импорта и экспорта, общие для всех устройств.</CardDescription>
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
          </FadeIn>
        );
      case "workflow":
        return (
          <FadeIn>
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
          {section === "account" ? (
            <FadeIn delay={100}>
              <Card>
                <CardHeader>
                  <CardTitle>Компания</CardTitle>
                  <CardDescription>Изменить отображаемое название рабочего пространства.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Новое имя компании"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button onClick={updateCompanyName}>Обновить</Button>
                </CardContent>
              </Card>
            </FadeIn>
          ) : null}
          {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        </>
      )}
    </SettingsShell>
  );
}
