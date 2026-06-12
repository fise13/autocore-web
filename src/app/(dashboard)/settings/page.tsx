"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, Laptop, Receipt, Workflow } from "lucide-react";

import { AccountSettingsPanel } from "@/components/account/account-settings-panel";
import { SupportSettingsCard } from "@/components/settings/support-settings-card";
import { SidebarSettingsCard } from "@/components/settings/sidebar-settings-card";
import { ThemeSettingsCard } from "@/components/settings/theme-settings-card";
import { SubscriptionStrip } from "@/components/billing/subscription-strip";
import { BrandingSettingsCard } from "@/components/settings/branding-settings-card";
import { CompanyAppConfigSettingsCard } from "@/components/settings/company-app-config-settings-card";
import { DisplayCurrencySettingsCard } from "@/components/settings/display-currency-settings-card";
import { CompanySettingsPanel } from "@/components/settings/company-settings-panel";
import { DataCleanupPanel } from "@/components/settings/data-cleanup-panel";
import { SettingsSectionId, SettingsShell } from "@/components/settings/settings-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { FadeIn } from "@/components/ui/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    case "appConfig":
    case "branding":
    case "accounting":
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
    case "sync":
    case "workflow":
      return "accounting";
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

  const { profile } = useAuth();
  const { isPro } = useBillingGate();
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

  function renderSection(section: SettingsSectionId) {
    switch (section) {
      case "account":
        return (
          <FadeIn>
            <div className="space-y-5">
              <AccountSettingsPanel onStatus={setStatus} />
              <SupportSettingsCard />
              <ThemeSettingsCard />
              <SidebarSettingsCard />
              <SubscriptionStrip />
            </div>
          </FadeIn>
        );
      case "branding":
        return profile?.companyId ? (
          <BrandingSettingsCard companyId={profile.companyId} onStatus={setStatus} />
        ) : null;
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
      case "appConfig":
        return profile?.companyId ? (
          <CompanyAppConfigSettingsCard companyId={profile.companyId} onStatus={setStatus} />
        ) : null;
      case "accounting":
        return (
          <FadeIn>
            <div className="space-y-5">
              <DisplayCurrencySettingsCard onStatus={setStatus} />
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    <CardTitle>{userCopy.settings.accounting}</CardTitle>
                  </div>
                  <CardDescription>Списки сотрудников и категорий для операций.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading ? <Badge variant="secondary">Загрузка…</Badge> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Сотрудники</Label>
                      <Textarea
                        value={employeesValue}
                        onChange={(event) => setEmployeesDraft(event.target.value)}
                        className="min-h-28"
                        placeholder={"Саня\nВалера"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Специфика бухгалтерии</Label>
                      <Textarea
                        value={specificsValue}
                        onChange={(event) => setSpecificsDraft(event.target.value)}
                        className="min-h-28"
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
                        setStatus("Настройки бухгалтерии сохранены");
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
                  <div className="flex items-center gap-2">
                    <Workflow className="size-4 text-primary" />
                    <CardTitle>{userCopy.settings.workflow}</CardTitle>
                  </div>
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

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Download className="size-4 text-primary" />
                    <CardTitle>{userCopy.settings.importExport}</CardTitle>
                  </div>
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
                <div className="flex items-center gap-2">
                  <Laptop className="size-4 text-primary" />
                  <CardTitle>{userCopy.settings.macOnly}</CardTitle>
                </div>
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
          {status ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground"
            >
              {status}
            </p>
          ) : null}
          {renderSection(section)}
        </>
      )}
    </SettingsShell>
  );
}
