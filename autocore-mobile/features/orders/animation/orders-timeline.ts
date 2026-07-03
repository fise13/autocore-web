export const ordersTimeline = {
  header: 0,
  search: 80,
  filters: 120,
  listBase: 180,
  listStagger: 36,
} as const;

export const ordersSpring = {
  chip: { damping: 26, stiffness: 380, mass: 0.72 },
  hero: { damping: 22, stiffness: 280, mass: 0.85 },
} as const;
