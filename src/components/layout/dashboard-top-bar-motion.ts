export const DASHBOARD_TOP_BAR_EASE = [0.22, 1, 0.36, 1] as const;

export const dashboardTopBarTransition = {
  duration: 0.16,
  ease: DASHBOARD_TOP_BAR_EASE,
};

export const dashboardTopBarSlotVariants = {
  initial: { opacity: 0, y: 7 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
};
