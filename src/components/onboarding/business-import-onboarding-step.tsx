"use client";

import { useCallback, useContext, useMemo } from "react";

import { DomainDictionaryContext } from "@/components/domain/domain-dictionary-provider";
import { BusinessMigration } from "@/components/migration/business-migration";
import type { MigrationLearnFn } from "@/components/migration/migration-types";
import { useAuth } from "@/components/providers/auth-provider";
import { markBusinessImportCompleted } from "@/lib/onboarding/mark-business-import-completed";
import { RECORD_TYPE_DOMAINS } from "@/lib/import";
import type { DomainCategory } from "@/lib/domain/types";

type BusinessImportOnboardingStepProps = {
  companyId: string;
  onDone: () => void;
};

/**
 * Full-screen business import inside the auth journey, after setup wizard.
 * Owner can upload legacy data or skip and fill everything manually later.
 */
export function BusinessImportOnboardingStep({ companyId, onDone }: BusinessImportOnboardingStepProps) {
  const { profile } = useAuth();
  const domain = useContext(DomainDictionaryContext);

  const getCompanyDictionary = useMemo(
    () => (domain ? (category: DomainCategory) => domain.getCompanyDictionary(category) : undefined),
    [domain],
  );

  const onLearn = useCallback<MigrationLearnFn>(
    async ({ recordType, value }) => {
      const category = RECORD_TYPE_DOMAINS[recordType]?.[0];
      if (!category || !domain) return;
      await domain.addCompanyEntry(category, value);
    },
    [domain],
  );

  const finish = useCallback(() => {
    void markBusinessImportCompleted(companyId, profile?.id ?? "").finally(onDone);
  }, [companyId, onDone, profile?.id]);

  return (
    <BusinessMigration
      variant="onboarding"
      companyId={companyId}
      userEmail={profile?.email}
      getCompanyDictionary={getCompanyDictionary}
      onLearn={domain ? onLearn : undefined}
      onManualSetup={finish}
      onOpenMotors={finish}
      onOpenWarehouse={finish}
    />
  );
}
