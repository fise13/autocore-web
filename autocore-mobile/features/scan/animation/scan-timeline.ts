export const scanTimeline = {
  camera: 0,
  header: 60,
  panel: 140,
  detectOutline: 180,
} as const;

export const scanSpring = {
  panel: { damping: 28, stiffness: 380, mass: 0.8 },
  detect: { damping: 22, stiffness: 420, mass: 0.7 },
} as const;
