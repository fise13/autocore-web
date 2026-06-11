export const motionStagger = (index: number, baseMs = 55) => `${index * baseMs}ms`;

export const motionEase = "cubic-bezier(0.22, 1, 0.36, 1)";

export const enterPageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export const enterPageTransition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const enterPanelVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export const enterPanelTransition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const,
};
