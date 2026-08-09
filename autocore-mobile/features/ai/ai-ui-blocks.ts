/** Typed UI blocks returned by the mobile AI session. */

export type AiObjectCardBlock = {
  type: 'objectCard';
  objectType: 'engine' | 'order' | 'location' | 'part' | 'document';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type AiMetricBlock = {
  type: 'metric';
  label: string;
  value: string;
  delta?: string;
};

export type AiTimelineBlock = {
  type: 'timeline';
  title: string;
  items: Array<{ id: string; title: string; meta?: string }>;
};

export type AiActionBlock = {
  type: 'action';
  label: string;
  href: string;
  primary?: boolean;
};

export type AiTextBlock = {
  type: 'text';
  body: string;
};

export type AiConfirmationBlock = {
  type: 'confirmation';
  title: string;
  body: string;
  confirmLabel: string;
  href: string;
};

export type AiUiBlock =
  | AiObjectCardBlock
  | AiMetricBlock
  | AiTimelineBlock
  | AiActionBlock
  | AiTextBlock
  | AiConfirmationBlock;
