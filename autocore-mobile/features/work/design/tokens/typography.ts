import type { TextStyle } from 'react-native';

export type WorkOsTypeRole =
  | 'display'
  | 'title'
  | 'headline'
  | 'metric'
  | 'metricSm'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'caption'
  | 'section'
  | 'tabular'
  | 'chip'
  | 'button';

export const workOsType: Record<WorkOsTypeRole, TextStyle> = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, lineHeight: 40 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, lineHeight: 34 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
  metric: { fontSize: 40, fontWeight: '700', letterSpacing: -1, lineHeight: 44, fontVariant: ['tabular-nums'] },
  metricSm: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 26, fontVariant: ['tabular-nums'] },
  body: { fontSize: 16, fontWeight: '400', letterSpacing: -0.1, lineHeight: 22 },
  callout: { fontSize: 15, fontWeight: '400', letterSpacing: -0.1, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0, lineHeight: 16 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: -0.08, lineHeight: 18 },
  tabular: { fontSize: 14, fontWeight: '500', letterSpacing: -0.1, lineHeight: 18, fontVariant: ['tabular-nums'] },
  chip: { fontSize: 13, fontWeight: '600', letterSpacing: -0.08, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, lineHeight: 20 },
};
