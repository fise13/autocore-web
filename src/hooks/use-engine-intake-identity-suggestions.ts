"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import type { DatalistOption } from "@/components/ui/datalist-input";
import { GLOBAL_DICTIONARIES } from "@/lib/domain/dictionaries";
import { normalizeCompanyId } from "@/lib/company-id";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";

const catalogRepository = createCatalogRepository();
const motorRepository = createMotorRepository();

function uniqueOptions(values: Iterable<string>): DatalistOption[] {
  const seen = new Set<string>();
  const options: DatalistOption[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ value: trimmed });
  }
  return options;
}

/**
 * Tab-complete options for engine-intake identity fields, sourced from the
 * company motors catalog (plus the global domain dictionary as a fallback).
 */
export function useEngineIntakeIdentitySuggestions(enabled: boolean) {
  const { profile } = useAuth();
  const uid = profile?.id ?? "";
  const companyId = normalizeCompanyId(profile?.companyId);
  const canLoad = Boolean(enabled && uid && companyId);

  const { brands, engines } = useEffectiveCatalog(
    catalogRepository,
    motorRepository,
    uid,
    companyId,
    { enabled: canLoad, loadMotorsForCatalog: true },
  );

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: canLoad,
  });

  const motors = motorsQuery.data ?? [];

  const brandOptions = useMemo(() => {
    return uniqueOptions([
      ...brands.map((brand) => brand.name),
      ...GLOBAL_DICTIONARIES.brands.map((entry) => entry.name),
    ]);
  }, [brands]);

  const engineCodesByBrand = useMemo(() => {
    const brandByLocalId = new Map(brands.map((brand) => [brand.localId, brand.name]));
    const map = new Map<string, string[]>();

    const add = (brandName: string, code: string) => {
      const trimmedBrand = brandName.trim();
      const trimmedCode = code.trim();
      if (!trimmedBrand || !trimmedCode) return;
      const key = trimmedBrand.toLowerCase();
      const list = map.get(key) ?? [];
      if (!list.some((item) => item.toLowerCase() === trimmedCode.toLowerCase())) {
        list.push(trimmedCode);
        map.set(key, list);
      }
    };

    for (const engine of engines) {
      const brandName = brandByLocalId.get(engine.brandLocalId);
      if (brandName) add(brandName, engine.code);
    }

    for (const motor of motors) {
      if (motor.brandName && motor.engineCode) {
        add(motor.brandName, motor.engineCode);
      }
    }

    for (const entry of GLOBAL_DICTIONARIES.engines) {
      if (entry.brand && entry.name) add(entry.brand, entry.name);
    }

    return map;
  }, [brands, engines, motors]);

  const allEngineCodeOptions = useMemo(() => {
    return uniqueOptions([
      ...engines.map((engine) => engine.code),
      ...motors.map((motor) => motor.engineCode ?? ""),
      ...GLOBAL_DICTIONARIES.engines.map((entry) => entry.name),
    ]);
  }, [engines, motors]);

  const serialOptions = useMemo(() => {
    return uniqueOptions(motors.map((motor) => motor.serialCode));
  }, [motors]);

  const engineCodeOptionsForBrand = useMemo(() => {
    return (brandName: string): DatalistOption[] => {
      const trimmed = brandName.trim();
      if (!trimmed) return allEngineCodeOptions;
      const fromBrand = engineCodesByBrand.get(trimmed.toLowerCase()) ?? [];
      if (fromBrand.length === 0) return allEngineCodeOptions;
      return uniqueOptions(fromBrand);
    };
  }, [allEngineCodeOptions, engineCodesByBrand]);

  const applyMotorIdentityFromSerial = useMemo(() => {
    return (serial: string): { brandName?: string; engineCode?: string } | null => {
      const normalized = serial.trim().toLowerCase();
      if (!normalized) return null;
      const motor = motors.find(
        (item) => item.serialCode.trim().toLowerCase() === normalized,
      );
      if (!motor) return null;
      return {
        brandName: motor.brandName?.trim() || undefined,
        engineCode: motor.engineCode?.trim() || undefined,
      };
    };
  }, [motors]);

  const brandForEngineCode = useMemo(() => {
    return (code: string): string | null => {
      const normalized = code.trim().toLowerCase();
      if (!normalized) return null;

      const matchingBrands = new Set<string>();
      for (const brand of brands) {
        const codes = engineCodesByBrand.get(brand.name.toLowerCase()) ?? [];
        if (codes.some((item) => item.toLowerCase() === normalized)) {
          matchingBrands.add(brand.name);
        }
      }
      for (const entry of GLOBAL_DICTIONARIES.engines) {
        if (entry.name.toLowerCase() === normalized && entry.brand) {
          matchingBrands.add(entry.brand);
        }
      }
      for (const motor of motors) {
        if (
          motor.engineCode?.trim().toLowerCase() === normalized &&
          motor.brandName?.trim()
        ) {
          matchingBrands.add(motor.brandName.trim());
        }
      }
      if (matchingBrands.size !== 1) return null;
      return [...matchingBrands][0] ?? null;
    };
  }, [brands, engineCodesByBrand, motors]);

  return {
    brandOptions,
    allEngineCodeOptions,
    engineCodeOptionsForBrand,
    serialOptions,
    applyMotorIdentityFromSerial,
    brandForEngineCode,
  };
}
