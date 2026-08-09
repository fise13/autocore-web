/** Home operational intelligence — Apple Health–style personal overview. */

export type HomeBodySectionId =
  | 'now'
  | 'attention'
  | 'today'
  | 'trend'
  | 'health'
  | 'ai'
  | 'recent';

export type HomeAccent = 'blue' | 'orange' | 'green' | 'red' | 'yellow';

export type HomeChartPoint = {
  label: string;
  value: number;
};

export type HomeTrend = {
  title: string;
  /** Narrative takeaway under the title. */
  insight: string;
  value: number;
  valueLabel: string;
  timeframeLabel: string;
  emptyLabel: string;
  /** 7-day average for baseline storytelling. */
  weekAverage: number;
  points: HomeChartPoint[];
  isEmpty: boolean;
  href?: string;
  accent: HomeAccent;
  sf: string;
};

export type HomeTodayFact = {
  id: string;
  text: string;
  href?: string;
};

export type HomeToday = {
  category: string;
  sf: string;
  accent: HomeAccent;
  /** Human insight sentence — Health “Highlights” style. */
  insight: string;
  primary: {
    value: number;
    label: string;
    href?: string;
  };
  /** Comparative column (e.g. 7-day average). */
  compare: {
    value: number;
    label: string;
  } | null;
  /** Mini series for in-card chart. */
  points: HomeChartPoint[];
  facts: HomeTodayFact[];
  meta: string;
};

export type HomeHealthCard = {
  id: string;
  title: string;
  primary: string;
  facts: string[];
  href?: string;
  tone?: 'default' | 'warning' | 'success';
  accent: HomeAccent;
  sf: string;
  meta: string;
};

export type HomeAttentionRow = {
  id: string;
  title: string;
  subtitle: string;
  tone: 'warning' | 'critical' | 'info';
  actionLabel: string;
  href: string;
};

export type HomeNow =
  | {
      kind: 'intake';
      eyebrow: string;
      title: string;
      serial: string;
      meta: string;
      photosLabel: string;
      remainingLabel: string | null;
      cta: string;
      href: string;
    }
  | {
      kind: 'summary';
      eyebrow: string;
      title: string;
      lines: string[];
      cta: string;
      href: string;
    }
  | {
      kind: 'clear';
      eyebrow: string;
      title: string;
      detail: string;
      cta: string;
      href: string;
    };

export type HomeActivityRow = {
  id: string;
  object: string;
  event: string;
  time: string;
  tone: 'default' | 'warning' | 'success' | 'muted';
  href?: string;
};

export type HomeAiInsight = {
  title: string;
  body: string;
  cta: string;
  href: string;
} | null;
