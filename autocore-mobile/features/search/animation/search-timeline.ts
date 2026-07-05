import { screenMotion } from '@/theme/screen';

const s = screenMotion.stagger;

/** Search screen entrance timeline */
export const searchTimeline = {
  header: 0,
  searchBar: s,
  filters: s * 2,
  idleRecent: s * 3,
  idleViewed: s * 4,
  idleCategories: s * 5,
  results: s,
  resultGroup: s * 2,
  resultRow: 28,
} as const;

export const searchSpring = {
  enter: screenMotion.spring,
  focus: screenMotion.press,
  press: screenMotion.press,
} as const;
