import {
  Box,
  Car,
  Circle,
  CircleHelp,
  Cog,
  Droplet,
  Fan,
  Lightbulb,
  Settings,
  Truck,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { RecordType } from "@/lib/import";

const ICONS: Record<RecordType, LucideIcon> = {
  engine: Cog,
  transmission: Settings,
  transferCase: Box,
  reducer: Circle,
  turbo: Fan,
  body: Car,
  optics: Lightbulb,
  suspension: Waves,
  electrical: Zap,
  consumable: Droplet,
  donorCar: Truck,
  unknown: CircleHelp,
};

export function recordTypeIcon(type: RecordType): LucideIcon {
  return ICONS[type] ?? CircleHelp;
}
