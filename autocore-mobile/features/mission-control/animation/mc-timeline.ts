import { mcMotion } from './mc-motion';

const s = mcMotion.stagger;

/** Mission Control entrance timeline — ms */
export const mcTimeline = {
  header: 0,
  revenue: s,
  tiles: s * 2,
  tileStagger: s,
  quickActions: s * 3,
  quickActionStagger: s,
  featuredInsight: s * 4,
  activity: s * 5,
  activityRowBase: s * 5.5,
  activityRowStagger: s,
  activityExpandStagger: 45,
  counterDuration: mcMotion.counterDuration,
  /** @deprecated */
  attention: s,
  attentionRow: s * 1.5,
  attentionRowStagger: s,
  today: s * 2,
  statStagger: s,
  kpiTileBase: s * 3,
  kpiTileStagger: s,
  kpis: s * 3,
  quickActionBase: s * 4.5,
  insights: s * 5,
  insightRow: s * 5.5,
  insightRowStagger: s,
} as const;
