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
    if (group.includes("оптик")) return Lightbulb;
    return Car;
  }
  if (category === "consumables") {
    const group = entry.category?.toLowerCase() ?? "";
    if (group.includes("фильтр") || group.includes("тормоз")) return Wrench;
    if (group.includes("свеч")) return Boxes;
    return Droplet;
  }
  return CATEGORY_ICON[category] ?? Boxes;
}
