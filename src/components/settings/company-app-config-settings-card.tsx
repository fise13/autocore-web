"use client";

import { useCallback, useState } from "react";
import { Boxes, Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";

import { CompanyAppConfigForm } from "@/components/company-config/company-app-config-form";
import { LastSavedHint } from "@/components/persistence/last-saved-hint";
import { usePersistedDocument } from "@/components/persistence/use-persisted-document";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { useCompanyAppConfigDraft } from "@/hooks/use-company-app-config-draft";
import type { PersistenceSyncHandler } from "@/lib/persistence";
import { saveCompanyAppConfig } from "@/lib/onboarding/save-company-app-config";
import { SETUP_WIZARD_COPY } from "@/lib/onboarding/setup-wizard-copy";
import { userCopy } from "@/lib/user-copy";

type CompanyAppConfigSettingsCardProps = {
  companyId: string;
  onStatus?: (message: string | null) => void;
};

type ConfigTab = "modules" | "categories" | "warranty";

const MODULE_KEYS = Object.keys(SETUP_WIZARD_COPY.modules);

export function CompanyAppConfigSettingsCard({ companyId, onStatus }: CompanyAppConfigSettingsCardProps) {
  const { profile } = useAuth();
  const { config, loaded } = useCompanyAppConfig(companyId);
  const [activeTab, setActiveTab] = useState<ConfigTab>("modules");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    draft,
    activePreset,
    enabledModulesCount,
    enabledCategoriesCount,
    applyPreset,
    toggleModule,
    toggleCategory,
    setCategoryMode,
    setDefaultWarrantyTemplate,
  } = useCompanyAppConfigDraft(config);

  const canSave = enabledModulesCount > 0 && Boolean(profile?.id);

  const appConfigKey = companyId
    ? { companyId, kind: "app_config" as const, id: "company" }
    : null;

  const appConfigSync = useCallback<PersistenceSyncHandler>(
    async ({ snapshot }) => {
      if (!profile?.id) return { ok: false, error: userCopy.settings.appConfigUi.noUser };
      try {
        await saveCompanyAppConfig({
          companyId,
          config: snapshot as typeof draft,
          userId: profile.id,
        });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : SETUP_WIZARD_COPY.validation.saveFailed,
        };
      }
    },
    [companyId, draft, profile?.id],
  );

  usePersistedDocument({
    key: appConfigKey,
    value: draft,
    label: userCopy.settings.appConfigUi.persistenceLabel,
    sync: appConfigSync,
    enabled: Boolean(appConfigKey) && loaded && canSave,
  });

  async function handleSave() {
    if (!profile?.id || !canSave) return;
    setBusy(true);
    setError(null);
    onStatus?.(null);
    try {
      await saveCompanyAppConfig({
        companyId,
        config: draft,
        userId: profile.id,
      });
      onStatus?.(SETUP_WIZARD_COPY.settings.saved);
    } catch (e) {
      const message = e instanceof Error ? e.message : SETUP_WIZARD_COPY.validation.saveFailed;
      setError(message);
      onStatus?.(message);
    } finally {
      setBusy(false);
    }
  }

  const statusBadge =
    activeTab === "modules" ? (
      <Badge variant="outline">
        {SETUP_WIZARD_COPY.actions.modulesSelected(enabledModulesCount, MODULE_KEYS.length)}
      </Badge>
    ) : activeTab === "categories" ? (
      <Badge variant="outline">{SETUP_WIZARD_COPY.actions.categoriesSelected(enabledCategoriesCount)}</Badge>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle>{SETUP_WIZARD_COPY.settings.title}</CardTitle>
            </div>
            <CardDescription>{SETUP_WIZARD_COPY.settings.subtitle}</CardDescription>
          </div>
          {statusBadge}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!loaded ? (
          <Badge variant="secondary">{userCopy.settings.appConfigUi.loading}</Badge>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConfigTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="modules" className="gap-1.5">
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">{SETUP_WIZARD_COPY.steps[0].title}</span>
                <span className="sm:hidden">{userCopy.settings.appConfigUi.tabModulesShort}</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5">
                <Boxes className="size-3.5" />
                <span className="hidden sm:inline">{SETUP_WIZARD_COPY.steps[1].title}</span>
                <span className="sm:hidden">{userCopy.settings.appConfigUi.tabCategoriesShort}</span>
              </TabsTrigger>
              <TabsTrigger value="warranty" className="gap-1.5">
                <ShieldCheck className="size-3.5" />
                <span className="hidden sm:inline">{SETUP_WIZARD_COPY.steps[2].title}</span>
                <span className="sm:hidden">{userCopy.settings.appConfigUi.tabWarrantyShort}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="modules" className="mt-5">
              <p className="mb-4 text-sm text-muted-foreground">{SETUP_WIZARD_COPY.steps[0].subtitle}</p>
              <CompanyAppConfigForm
                draft={draft}
                activePreset={activePreset}
                onApplyPreset={applyPreset}
                onToggleModule={toggleModule}
                onToggleCategory={toggleCategory}
                onSetCategoryMode={setCategoryMode}
                onSetDefaultWarrantyTemplate={setDefaultWarrantyTemplate}
                section="modules"
                showValidation
              />
            </TabsContent>

            <TabsContent value="categories" className="mt-5">
              <p className="mb-4 text-sm text-muted-foreground">{SETUP_WIZARD_COPY.steps[1].subtitle}</p>
              <CompanyAppConfigForm
                draft={draft}
                activePreset={activePreset}
                onApplyPreset={applyPreset}
                onToggleModule={toggleModule}
                onToggleCategory={toggleCategory}
                onSetCategoryMode={setCategoryMode}
                onSetDefaultWarrantyTemplate={setDefaultWarrantyTemplate}
                section="categories"
              />
            </TabsContent>

            <TabsContent value="warranty" className="mt-5">
              <p className="mb-4 text-sm text-muted-foreground">{SETUP_WIZARD_COPY.steps[2].subtitle}</p>
              <CompanyAppConfigForm
                draft={draft}
                activePreset={activePreset}
                onApplyPreset={applyPreset}
                onToggleModule={toggleModule}
                onToggleCategory={toggleCategory}
                onSetCategoryMode={setCategoryMode}
                onSetDefaultWarrantyTemplate={setDefaultWarrantyTemplate}
                section="warranty"
              />
            </TabsContent>
          </Tabs>
        )}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{SETUP_WIZARD_COPY.settings.hint}</p>
            {appConfigKey ? <LastSavedHint persistenceKey={appConfigKey} /> : null}
          </div>
          <Button type="button" disabled={busy || !loaded || !canSave} onClick={() => void handleSave()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            {busy ? SETUP_WIZARD_COPY.settings.saving : SETUP_WIZARD_COPY.settings.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
