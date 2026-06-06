import Link from "next/link";
import {
  Banknote,
  Package,
  Radar,
  Settings,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

import { FeatureIcon } from "@/components/marketing/site/feature-icon";
import { marketingRoutes } from "@/lib/marketing-routes";

const MODULES = [
  { icon: Radar, label: "Mission Control", href: `${marketingRoutes.home}#mission-control`, tone: "blue" as const },
  { icon: Warehouse, label: "Склад", href: `${marketingRoutes.home}#inventory`, tone: "green" as const },
  { icon: Wrench, label: "Заказ-наряды", href: `${marketingRoutes.home}#work-orders`, tone: "amber" as const },
  { icon: Banknote, label: "Бухгалтерия", href: marketingRoutes.modules, tone: "blue" as const },
  { icon: Package, label: "Инвентарь", href: marketingRoutes.modules, tone: "green" as const },
  { icon: Users, label: "Сотрудники", href: marketingRoutes.security, tone: "violet" as const },
  { icon: Settings, label: "Настройки", href: marketingRoutes.product, tone: "neutral" as const },
] as const;

export function ModulesStripSection() {
  return (
    <section className="border-y border-border bg-muted/25 py-12">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">Модули</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Всё, что нужно дилеру</h2>
          </div>
          <Link href={marketingRoutes.modules} className="text-sm font-medium text-primary hover:underline">
            Смотреть все модули →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {MODULES.map((mod) => (
            <Link
              key={mod.label}
              href={mod.href}
              className="autocore-metric-card flex flex-col items-center gap-3 p-4 text-center transition-colors hover:border-primary/30"
            >
              <FeatureIcon icon={mod.icon} tone={mod.tone} size="md" />
              <span className="text-sm font-medium">{mod.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
