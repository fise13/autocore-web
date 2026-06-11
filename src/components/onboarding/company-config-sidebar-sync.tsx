"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { useCompanyAppConfig } from "@/hooks/use-company-app-config";
import { applyCompanyModulesToSidebar } from "@/lib/navigation/apply-company-modules";

export function CompanyConfigSidebarSync() {
  const { profile } = useAuth();
  const companyId = profile?.companyId?.trim() || null;
  const { config, loaded } = useCompanyAppConfig(companyId);
  const { customization, setCustomization, hydrated } = useSidebarCustomization();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !loaded || !config?.onboardingCompleted) return;
    const signature = `${companyId}:${config.updatedAt?.toISOString() ?? "na"}:${JSON.stringify(config.modules)}`;
    if (appliedRef.current === signature) return;
    appliedRef.current = signature;
    setCustomization(applyCompanyModulesToSidebar(customization, config));
  }, [companyId, config, customization, hydrated, loaded, setCustomization]);

  return null;
}
