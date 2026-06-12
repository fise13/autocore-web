import { Permission, UserEntity, UserRole } from "@/domain/user";
import {
  getEnabledNavItems,
  SIDEBAR_NAV_META,
  type SidebarCustomization,
  type SidebarNavItemId,
} from "@/lib/navigation/sidebar-customization";
import { can } from "@/lib/auth/permissions";

/** Only shop-floor mechanics see own payroll in navigation. */
export function canAccessMyEarnings(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  return user.role === "mechanic" && can(user, "payroll_view_own");
}

/** Restricted roles see only these sidebar sections (owner/manager use permissions). */
const ROLE_NAV_ALLOWLIST: Partial<Record<UserRole, readonly SidebarNavItemId[]>> = {
  mechanic: ["work_orders", "my_earnings"],
  diagnostician: ["work_orders"],
  accountant: ["accounting"],
  admin: ["home", "work_orders", "warehouse"],
};

function roleNavAllowlist(role: UserRole | undefined): readonly SidebarNavItemId[] | null {
  if (!role) return null;
  return ROLE_NAV_ALLOWLIST[role] ?? null;
}

function navPermission(navId: SidebarNavItemId): Permission | null {
  switch (navId) {
    case "home":
      return null;
    case "motors":
    case "sold":
    case "warehouse":
      return "inventory_view";
    case "work_orders":
      return "work_orders_view";
    case "my_earnings":
      return "payroll_view_own";
    case "accounting":
      return "accounting_view";
    default:
      return null;
  }
}

export function canAccessMissionControl(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  const allowlist = roleNavAllowlist(user.role);
  if (allowlist) return allowlist.includes("home");
  return (
    can(user, "accounting_view") ||
    can(user, "inventory_view") ||
    can(user, "work_orders_view") ||
    can(user, "employee_view")
  );
}

export function isNavAllowed(
  user: UserEntity | null | undefined,
  navId: SidebarNavItemId,
): boolean {
  if (!user) return false;

  const allowlist = roleNavAllowlist(user.role);
  if (allowlist && !allowlist.includes(navId)) return false;

  if (navId === "home") return canAccessMissionControl(user);

  const permission = navPermission(navId);
  if (navId === "my_earnings") return canAccessMyEarnings(user);
  if (!permission) return true;
  return can(user, permission);
}

export function resolveVisibleNavItems(
  user: UserEntity | null | undefined,
  customization: SidebarCustomization,
): SidebarNavItemId[] {
  return getEnabledNavItems(customization).filter((navId) => isNavAllowed(user, navId));
}

export function canAccessMotorsArea(user: UserEntity | null | undefined): boolean {
  if (!user) return false;
  if (!can(user, "inventory_view")) return false;
  return isNavAllowed(user, "motors");
}

export function canAccessPath(
  user: UserEntity | null | undefined,
  pathname: string,
): boolean {
  if (!user) return false;

  if (pathname === "/" || pathname === "") {
    return canAccessMissionControl(user);
  }
  if (pathname.startsWith("/work-orders")) {
    return can(user, "work_orders_view");
  }
  if (pathname.startsWith("/accounting")) {
    return can(user, "accounting_view");
  }
  if (pathname.startsWith("/my-earnings")) {
    return canAccessMyEarnings(user);
  }
  if (pathname.startsWith("/warehouse")) {
    return isNavAllowed(user, "warehouse");
  }
  if (pathname === "/motors" || pathname.startsWith("/specific/")) {
    return canAccessMotorsArea(user);
  }
  if (pathname === "/sold") {
    return isNavAllowed(user, "sold");
  }
  if (pathname.startsWith("/employees") || pathname.startsWith("/roles")) {
    return can(user, "employee_view") || can(user, "employee_manage");
  }
  if (pathname.startsWith("/settings")) {
    return true;
  }

  return true;
}

export function defaultAppPath(user: UserEntity | null | undefined): string {
  if (!user) return "/login";

  const allowlist = roleNavAllowlist(user.role);
  if (allowlist?.length) {
    const navId = allowlist[0];
    return SIDEBAR_NAV_META[navId].href;
  }

  if (canAccessMissionControl(user)) return "/";
  if (can(user, "work_orders_view")) return "/work-orders";
  if (canAccessMyEarnings(user)) return "/my-earnings";
  if (can(user, "accounting_view")) return "/accounting";
  if (can(user, "inventory_view")) return "/warehouse";
  return "/settings";
}
