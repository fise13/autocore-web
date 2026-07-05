import { screenMotion } from '@/theme/screen';

const s = screenMotion.stagger;

export const ordersTimeline = {
  header: 0,
  search: s * 2,
  filters: s * 3,
  listBase: s * 4,
  listStagger: s,
} as const;

export const ordersSpring = {
  chip: screenMotion.press,
  hero: screenMotion.spring,
} as const;
