import {
  Boxes,
  Car,
  Cog,
  Droplet,
  Flag,
  Fuel,
  Gauge,
  Lightbulb,
  Palette,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { DomainCategory, DomainEntry } from "@/lib/domain/types";

const CATEGORY_ICON: Record<DomainCategory, LucideIcon> = {
  engines: Cog,
  transmissions: Cog,
  bodyParts: Car,
  consumables: Droplet,
  brands: Car,
  models: Car,
  fuelTypes: Fuel,
  driveTypes: Gauge,
  colors: Palette,
  countries: Flag,
};

/** Resolve the right glyph for an entry, with category-aware nuance. */
export function domainIconFor(category: DomainCategory, entry: DomainEntry): LucideIcon {
  if (category === "bodyParts") {
    const group = entry.category?.toLowerCase() ?? "";
    if (group.includes("optic") || group.includes("\u043e\u043f\u0442\u0438\u043a")) return Lightbulb;
    return Car;
  }
  if (category === "consumables") {
    const group = entry.category?.toLowerCase() ?? "";
    if (
      group.includes("filter") ||
      group.includes("brake") ||
      group.includes("\u0444\u0438\u043b\u044c\u0442\u0440") ||
      group.includes("\u0442\u043e\u0440\u043c\u043e\u0437")
    ) {
      return Wrench;
    }
    if (group.includes("spark") || group.includes("\u0441\u0432\u0435\u0447")) return Boxes;
    return Droplet;
  }
  return CATEGORY_ICON[category] ?? Boxes;
}
