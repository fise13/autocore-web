"use client";

import { useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";

import { DomainDictionaryContext } from "@/components/domain/domain-dictionary-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { RECORD_TYPE_DOMAINS } from "@/lib/import";
import type { DomainCategory } from "@/lib/domain/types";

import { BusinessMigration } from "./business-migration";
import type { MigrationLearnFn } from "./migration-types";

/**
 * Thin host that connects the framework-agnostic migration experience to the
 * app: auth (company + email), the Company Dictionary (suggestions + continuous
 * learning), and navigation to the imported workspaces.
 */
export function MigrationWorkspace() {
  const { profile } = useAuth();
  const router = useRouter();
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

  return (
    <BusinessMigration
      companyId={profile?.companyId ?? undefined}
      userEmail={profile?.email}
      getCompanyDictionary={getCompanyDictionary}
      onLearn={domain ? onLearn : undefined}
      onOpenMotors={() => router.push("/motors")}
      onOpenWarehouse={() => router.push("/warehouse")}
      onExit={() => router.push("/motors")}
    />
  );
}
