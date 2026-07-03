/** Search screen entrance timeline */
export const searchTimeline = {
  searchBar: 0,
  filters: 80,
  idleRecent: 140,
  idleViewed: 220,
  idleCategories: 300,
  results: 0,
} as const;

export const searchSpring = {
  enter: { damping: 34, stiffness: 320, mass: 0.9 },
  focus: { damping: 28, stiffness: 360, mass: 0.8 },
  press: { damping: 28, stiffness: 420, mass: 0.75 },
} as const;
