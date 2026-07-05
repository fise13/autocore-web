import { screenMotion } from '@/theme/screen';

const s = screenMotion.stagger;

export const profileTimeline = {
  header: 0,
  hero: s,
  quickBase: s * 2,
  quickStagger: s,
  preferencesTitle: s * 4,
  preferencesBase: s * 5,
  preferencesStagger: s,
  workspaceTitle: s * 7,
  workspaceBase: s * 8,
  workspaceStagger: s,
  danger: s * 10,
} as const;

export const profileSpring = {
  press: screenMotion.press,
} as const;
