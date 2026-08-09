import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { HomeSectionId } from '../../../lib/shell/types';

import type {
  HomeActivityRow,
  HomeAttentionRow,
  HomeHealthCard,
  HomeNow,
  HomeToday,
  HomeTrend,
} from '../types-home';
import { resolveHomeLayout } from './resolve-home-layout';

const ALL_SECTIONS: HomeSectionId[] = [
  'identity',
  'attention',
  'continue',
  'today',
  'movement',
  'aiInsight',
];

const clearNow: HomeNow = {
  kind: 'clear',
  eyebrow: 'Now',
  title: "You're all caught up.",
  detail: 'Nothing needs your attention right now.',
  cta: 'Open Work',
  href: '/(tabs)/work',
};

const intakeNow: HomeNow = {
  kind: 'intake',
  eyebrow: 'Now',
  title: 'Engine intake',
  serial: 'BBHJ',
  meta: 'Identity not confirmed',
  photosLabel: '0 photos',
  remainingLabel: '3 important views remaining',
  cta: 'Continue',
  href: '/intake/1',
};

const today: HomeToday = {
  category: 'Orders',
  sf: 'doc.text.fill',
  accent: 'orange',
  insight: 'You are on pace with your usual orders activity.',
  primary: { value: 2, label: 'orders' },
  compare: { value: 1, label: '7-day avg' },
  points: [
    { label: 'Su', value: 0 },
    { label: 'Mo', value: 1 },
  ],
  facts: [{ id: 'r', text: '1 engine received' }],
  meta: 'Today',
};

const trend: HomeTrend = {
  title: 'Engines received',
  insight: 'Your engines received have been steady over the last 7 days.',
  value: 1,
  valueLabel: 'engine received today',
  timeframeLabel: '7-day activity',
  emptyLabel: 'No engines received today.',
  weekAverage: 1,
  points: [
    { label: 'Su', value: 0 },
    { label: 'Mo', value: 1 },
  ],
  isEmpty: false,
  accent: 'blue',
  sf: 'gearshape.2.fill',
};

const health: HomeHealthCard[] = [
  {
    id: 'docs',
    title: 'Documentation',
    primary: '2 in intake',
    facts: ['2 engines ready'],
    accent: 'blue',
    sf: 'doc.viewfinder',
    meta: 'Today',
  },
];

const activity: HomeActivityRow[] = [
  {
    id: 'a1',
    object: 'Order #2',
    event: 'Delivered',
    time: '21:35',
    tone: 'default',
  },
];

function base(overrides: Partial<Parameters<typeof resolveHomeLayout>[0]> = {}) {
  return resolveHomeLayout({
    homeSections: ALL_SECTIONS,
    now: clearNow,
    attention: [],
    today,
    trend,
    health,
    aiInsight: null,
    activity,
    ...overrides,
  });
}

describe('resolveHomeLayout', () => {
  it('leads with Today when nothing critical and no active intake', () => {
    assert.deepEqual(base(), ['today', 'now', 'trend', 'health', 'recent']);
  });

  it('leads with Now when an intake session is active', () => {
    assert.deepEqual(base({ now: intakeNow }), [
      'now',
      'today',
      'trend',
      'health',
      'recent',
    ]);
  });

  it('leads with Attention when a critical row exists', () => {
    const attention: HomeAttentionRow[] = [
      {
        id: 'c1',
        title: 'Serial needs confirmation',
        subtitle: 'UF102415',
        tone: 'critical',
        actionLabel: 'Review',
        href: '/intake/1',
      },
    ];
    assert.deepEqual(base({ attention, now: intakeNow }), [
      'attention',
      'now',
      'today',
      'trend',
      'health',
      'recent',
    ]);
  });

  it('hides attention and ai when empty', () => {
    const sections = base({
      attention: [],
      aiInsight: null,
    });
    assert.equal(sections.includes('attention'), false);
    assert.equal(sections.includes('ai'), false);
  });

  it('includes ai when insight is present', () => {
    const sections = base({
      aiInsight: {
        title: 'AI insight',
        body: '2 engines are waiting for documentation.',
        cta: 'Review',
        href: '/intake',
      },
    });
    assert.ok(sections.includes('ai'));
  });

  it('respects shell gating — mechanic without today still gets now', () => {
    const sections = resolveHomeLayout({
      homeSections: ['identity', 'attention', 'continue', 'movement'],
      now: intakeNow,
      attention: [],
      today,
      trend,
      health,
      aiInsight: null,
      activity,
    });
    assert.deepEqual(sections, ['now', 'recent']);
  });
});
