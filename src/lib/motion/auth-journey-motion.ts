export const authJourneyEase = [0.22, 1, 0.36, 1] as const;

export const authJourneyStepTransition = {
  duration: 0.48,
  ease: authJourneyEase,
} as const;

export const authJourneyPanelTransition = {
  duration: 0.32,
  ease: authJourneyEase,
} as const;

export const authJourneyQuickTransition = {
  duration: 0.22,
  ease: authJourneyEase,
} as const;

export function authJourneyStepVariants(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { opacity: 0, x: 36, filter: "blur(8px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -32, filter: "blur(6px)" },
  };
}

export function authJourneyPanelVariants(reducedMotion: boolean, direction = 1) {
  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { opacity: 0, x: direction * 20, filter: "blur(6px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: direction * -16, filter: "blur(4px)" },
  };
}

export function authJourneyStaggerItem(index: number, reducedMotion: boolean) {
  return authJourneyReveal(index, reducedMotion, 0.05);
}

export function authJourneyReveal(
  index: number,
  reducedMotion: boolean,
  step = 0.07,
  offset = 0.08,
) {
  if (reducedMotion) {
    return { initial: false, animate: { opacity: 1 } };
  }

  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      delay: offset + index * step,
      duration: 0.42,
      ease: authJourneyEase,
    },
  };
}

export function authJourneyBrandReveal(
  index: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) {
    return { initial: false, animate: { opacity: 1 } };
  }

  const delays = [0.12, 0.28, 0.46, 0.62];

  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: {
      delay: delays[index] ?? 0.12 + index * 0.14,
      duration: 0.55,
      ease: authJourneyEase,
    },
  };
}

export function authJourneySuccessVariants(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { opacity: 0, scale: 0.94, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };
}

export const authJourneyShake = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.42, ease: authJourneyEase },
};
