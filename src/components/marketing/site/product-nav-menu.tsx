import Link from "next/link";

import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { cn } from "@/lib/utils";

type ProductNavMenuProps = {
  onNavigate?: () => void;
  className?: string;
};

export function ProductNavMenu({ onNavigate, className }: ProductNavMenuProps) {
  const { productGroup } = siteNavigation;

  return (
    <nav className={cn("marketing-product-nav-minimal", className)} aria-label="Продукт">
      <ul className="marketing-product-nav-minimal-list">
        {productGroup.items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} onClick={onNavigate} className="marketing-product-nav-minimal-link">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
