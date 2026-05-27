"use client";

import { cn } from "@/lib/utils";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";

type MotorFiltersSidebarProps = {
  brands: BrandEntity[];
  engines: EngineEntity[];
  selectedBrandLocalId: number | null;
  selectedEngineLocalId: number | null;
  availability: MotorAvailability;
  onBrandChange: (brandLocalId: number | null) => void;
  onEngineChange: (engineLocalId: number | null) => void;
  onAvailabilityChange: (value: MotorAvailability) => void;
  disabled?: boolean;
};

export function MotorFiltersSidebar({
  brands,
  engines,
  selectedBrandLocalId,
  selectedEngineLocalId,
  availability,
  onBrandChange,
  onEngineChange,
  onAvailabilityChange,
  disabled = false,
}: MotorFiltersSidebarProps) {
  const visibleEngines = selectedBrandLocalId
    ? engines.filter((engine) => engine.brandLocalId === selectedBrandLocalId)
    : engines;

  const selectedBrand = brands.find((brand) => brand.localId === selectedBrandLocalId);
  const selectedEngine = engines.find((engine) => engine.localId === selectedEngineLocalId);

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-56">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Наличие</p>
        <div className="grid gap-1">
          {(
            [
              ["all", "Все"],
              ["available", "В наличии"],
              ["sold", "Проданные"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onAvailabilityChange(value)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-left text-sm transition",
                availability === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Бренды</p>
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBrandChange(null)}
            className={cn(
              "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition",
              selectedBrandLocalId == null
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Все бренды
          </button>
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              disabled={disabled}
              onClick={() => onBrandChange(brand.localId)}
              className={cn(
                "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition",
                selectedBrandLocalId === brand.localId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Двигатели</p>
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onEngineChange(null)}
            className={cn(
              "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition",
              selectedEngineLocalId == null
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Все двигатели
          </button>
          {visibleEngines.map((engine) => (
            <button
              key={engine.id}
              type="button"
              disabled={disabled}
              onClick={() => onEngineChange(engine.localId)}
              className={cn(
                "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition",
                selectedEngineLocalId === engine.localId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {engine.code}
            </button>
          ))}
        </div>
      </div>

      {(selectedBrand || selectedEngine) && (
        <p className="text-xs text-muted-foreground">
          Фильтр: {[selectedBrand?.name, selectedEngine?.code].filter(Boolean).join(" · ")}
        </p>
      )}
    </aside>
  );
}
