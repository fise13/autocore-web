import type { HomeSectionId } from '../../../lib/shell/types';

import type {
  HomeActivityRow,
  HomeAiInsight,
  HomeAttentionRow,
  HomeBodySectionId,
  HomeHealthCard,
  HomeNow,
  HomeToday,
  HomeTrend,
} from '../types-home';

export type HomeLayoutInput = {
  /** Role/module-gated sections from the shell registry. */
  homeSections: HomeSectionId[];
  now: HomeNow;
  attention: HomeAttentionRow[];
  today: HomeToday;
  trend: HomeTrend;
  health: HomeHealthCard[];
  aiInsight: HomeAiInsight;
  activity: HomeActivityRow[];
};

const CANONICAL: HomeBodySectionId[] = [
  'now',
  'attention',
  'today',
  'trend',
  'health',
  'ai',
  'recent',
];

function shellAllows(section: HomeBodySectionId, homeSections: HomeSectionId[]): boolean {
  switch (section) {
    case 'now':
      return homeSections.includes('continue');
    case 'attention':
      return homeSections.includes('attention');
    case 'today':
    case 'trend':
    case 'health':
      return homeSections.includes('today');
    case 'ai':
      return homeSections.includes('aiInsight');
    case 'recent':
      return homeSections.includes('movement');
    default:
      return false;
  }
}

function isPresent(section: HomeBodySectionId, input: HomeLayoutInput): boolean {
  switch (section) {
    case 'now':
      return true;
    case 'attention':
      return input.attention.length > 0;
    case 'today':
      return true;
    case 'trend':
      return true;
    case 'health':
      return input.health.length > 0;
    case 'ai':
      return input.aiInsight != null;
    case 'recent':
      return input.activity.length > 0;
    default:
      return false;
  }
}

function pickLead(input: HomeLayoutInput, available: HomeBodySectionId[]): HomeBodySectionId | null {
  const hasCritical = input.attention.some((r) => r.tone === 'critical');
  if (hasCritical && available.includes('attention')) return 'attention';
  if (input.now.kind === 'intake' && available.includes('now')) return 'now';
  if (available.includes('today')) return 'today';
  return available[0] ?? null;
}

/**
 * Adaptive Home body order.
 * Always starts with the highest-priority present section, then fills
 * remaining non-empty sections in canonical order.
 */
export function resolveHomeLayout(input: HomeLayoutInput): HomeBodySectionId[] {
  const available = CANONICAL.filter(
    (id) => shellAllows(id, input.homeSections) && isPresent(id, input),
  );
  if (available.length === 0) return [];

  const lead = pickLead(input, available);
  if (!lead) return available;

  const rest = CANONICAL.filter((id) => id !== lead && available.includes(id));
  return [lead, ...rest];
}
