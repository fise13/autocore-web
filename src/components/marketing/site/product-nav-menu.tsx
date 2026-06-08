import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  LayoutGrid,
  Package,
  Radar,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { marketingRoutes } from "@/lib/marketing-routes";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, LucideIcon> = {
  "mission-control": Radar,
  warehouse: Warehouse,
  "work-orders": Wrench,
  accounting: Banknote,
  inventory: Package,
  employees: Users,
};

function moduleIdFromHref(href: string): string | null {
  const hash = href.split("#")[1];
  return hash ?? null;
}

type ProductNavMenuProps = {
  onNavigate?: () => void;
  className?: string;
};

export function ProductNavMenu({ onNavigate, className }: ProductNavMenuProps) {
  const { productGroup } = siteNavigation;
  const overview = productGroup.items[0];
  const catalog = productGroup.items[1];
  const modules = productGroup.items.slice(2);

  return (
    <div className={cn("marketing-product-nav", className)}>
      <div className="marketing-product-nav-featured">
        <Link
          href={overview.href}
          onClick={onNavigate}
          className="marketing-product-nav-featured-link group"
        >
          <div className="marketing-product-nav-featured-copy">
            <p className="text-sm font-semibold">{overview.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{overview.description}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
        <Link href={catalog.href} onClick={onNavigate} className="marketing-product-nav-catalog-link">
          <LayoutGrid className="size-4 text-primary" aria-hidden />
          <span>{catalog.label}</span>
          <ArrowRight className="ml-auto size-3.5 opacity-50" aria-hidden />
        </Link>
      </div>

      <div className="marketing-product-nav-modules">
        <p className="marketing-product-nav-label">Модули</p>
        <div className="marketing-product-nav-grid">
          {modules.map((item) => {
            const id = moduleIdFromHref(item.href);
            const Icon = (id && MODULE_ICONS[id]) || Radar;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="marketing-product-nav-module group"
              >
                <span className="marketing-product-nav-module-icon" aria-hidden>
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
        <Link href={marketingRoutes.modules} onClick={onNavigate} className="marketing-product-nav-all">
          Весь каталог модулей
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
