export const WORK_ORDERS_MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const workOrdersSectionTransition = {
  duration: 0.24,
  ease: WORK_ORDERS_MOTION_EASE,
};

export const workOrdersSectionVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const workOrdersListVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: WORK_ORDERS_MOTION_EASE },
  },
};

export const workOrdersListItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: WORK_ORDERS_MOTION_EASE },
  },
};

export const workOrdersDetailTransition = {
  duration: 0.2,
  ease: WORK_ORDERS_MOTION_EASE,
};

export const workOrdersDetailVariants = {
  initial: { opacity: 0, x: 14 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

export const workOrdersNavSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
};
