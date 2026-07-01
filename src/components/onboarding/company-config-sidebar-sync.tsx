"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import {
  INVENTORY_TAXONOMY_VERSION,
  migrateInventoryTaxonomyUseCase,
} from "@/application/use-cases/migrate-inventory-taxonomy";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { applyCompanyModulesToSidebar } from "@/lib/navigation/apply-company-modules";

const specificCategoryRepository = createSpecificCategoryRepository();

export function CompanyConfigSidebarSync() {
  const { profile } = useAuth();
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);
  const { customization, setCustomization, hydrated } = useSidebarCustomization();
  const appliedRef = useRef<string | null>(null);
  const migrationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loaded || !config || !companyId || !profile?.id) return;
    if (config.taxonomyVersion === INVENTORY_TAXONOMY_VERSION) return;
    const signature = `${companyId}:${config.updatedAt?.toISOString() ?? "na"}`;
    if (migrationRef.current === signature) return;
    migrationRef.current = signature;
    void migrateInventoryTaxonomyUseCase({
      companyId,
      actorUserId: profile.id,
      config,
      specificCategoryRepository,
    }).catch(() => undefined);
  }, [companyId, config, loaded, profile?.id]);

  useEffect(() => {
    if (!hydrated || !loaded || !config?.onboardingCompleted) return;
    const signature = `${companyId}:${config.updatedAt?.toISOString() ?? "na"}:${JSON.stringify(config.modules)}`;
    if (appliedRef.current === signature) return;
    appliedRef.current = signature;
    setCustomization(applyCompanyModulesToSidebar(customization, config));
  }, [companyId, config, customization, hydrated, loaded, setCustomization]);

  return null;
}
