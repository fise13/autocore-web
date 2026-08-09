export const workOsSprings = {
  press: { damping: 28, stiffness: 420, mass: 0.7 },
  settle: { damping: 26, stiffness: 280, mass: 0.9 },
  ring: { damping: 18, stiffness: 120, mass: 1 },
  sheet: { damping: 30, stiffness: 320, mass: 0.85 },
  list: { damping: 32, stiffness: 360, mass: 0.8 },
  nav: { damping: 28, stiffness: 300, mass: 0.9 },
} as const;

export const workOsTiming = {
  chip: 160,
  fade: 180,
  skeleton: 900,
} as const;
