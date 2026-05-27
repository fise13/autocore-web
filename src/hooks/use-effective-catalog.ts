"use client";

import { useMemo } from "react";

import { useCatalogRealtime } from "@/hooks/use-catalog-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import {
  deriveCatalogFromMotors,
  mergeCatalogSources,
} from "@/lib/catalog-from-motors";
import { normalizeCompanyId } from "@/lib/company-id";
import { CatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

export function useEffectiveCatalog(
  catalogRepository: CatalogRepository,
  motorRepository: MotorRepository,
  uid: string,
  companyId: string,
  options?: { loadMotorsForCatalog?: boolean; enabled?: boolean },
) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const enabled = options?.enabled ?? true;
  const firestoreCatalog = useCatalogRealtime(catalogRepository, normalizedCompanyId, enabled);

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId: normalizedCompanyId,
    enabled: options?.loadMotorsForCatalog ?? false,
  });

  const derivedCatalog = useMemo(
    () => deriveCatalogFromMotors(motorsQuery.data ?? [], normalizedCompanyId),
    [motorsQuery.data, normalizedCompanyId],
  );

  const catalog = useMemo(
    () =>
      mergeCatalogSources(
        { brands: firestoreCatalog.brands, engines: firestoreCatalog.engines },
        derivedCatalog,
      ),
    [firestoreCatalog.brands, firestoreCatalog.engines, derivedCatalog],
  );

  return catalog;
}
