export const SIDEBAR_NAV_EASE = [0.22, 1, 0.36, 1] as const;

export const APP_SIDEBAR_ACTIVE_LAYOUT_ID = "app-sidebar-active";

export const sidebarNavActiveSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

export const sidebarNavItemEnterTransition = (index: number) => ({
  duration: 0.22,
  delay: 0.03 + index * 0.035,
  ease: SIDEBAR_NAV_EASE,
});

export const sidebarBlockEnterTransition = (blockIndex: number) => ({
  duration: 0.24,
  delay: 0.05 + blockIndex * 0.04,
  ease: SIDEBAR_NAV_EASE,
});
