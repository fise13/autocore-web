"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Car, Users } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { WorkOrdersPrimaryAction } from "@/components/work-orders/work-orders-directory-ui";
import { workOrdersNavSpring } from "@/components/work-orders/work-orders-motion";
import { sidebarNavIconClass, sidebarNavRowClass, sidebarSectionLabelClass } from "@/components/layout/sidebar-nav-row";
import { can } from "@/lib/auth/permissions";
import { parseWorkOrdersSection, workOrdersHref } from "@/lib/navigation/work-orders-nav";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        sidebarNavRowClass,
        "relative overflow-hidden",
        active
          ? "text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
      )}
    >
      {active ? (
        <motion.span
          layoutId="work-orders-nav-active"
          className="absolute inset-0 rounded-lg bg-primary/12 shadow-sm"
          transition={workOrdersNavSpring}
        />
      ) : null}
      <Icon className={cn(sidebarNavIconClass, "relative z-10", active && "opacity-100")} />
      <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

export function WorkOrdersSidebarContext() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const canEdit = can(profile, "work_orders_edit");
  const section = parseWorkOrdersSection(searchParams.get("section"));

  if (pathname !== "/work-orders" && !pathname.startsWith("/work-orders/")) {
    return null;
  }

  return (
    <div className="space-y-3 px-1 py-1">
      <div>
        <p className={sidebarSectionLabelClass}>Заказ-наряды</p>
        <LayoutGroup id="work-orders-sidebar">
          <div className="space-y-0.5">
            <NavLink
              href={workOrdersHref({ section: "clients" })}
              active={section === "clients"}
              icon={Users}
              label="Клиенты"
            />
            <NavLink
              href={workOrdersHref({ section: "vehicles" })}
              active={section === "vehicles"}
              icon={Car}
              label="Автомобили"
            />
          </div>
        </LayoutGroup>
      </div>

      {canEdit ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <WorkOrdersPrimaryAction
            href={workOrdersHref({ section: "orders", create: true })}
            label="Новый заказ-наряд"
          />
        </motion.div>
      ) : null}
    </div>
  );
}
