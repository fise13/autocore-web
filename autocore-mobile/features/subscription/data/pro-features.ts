/**
 * The Pro value proposition, as shown on the paywall.
 *
 * Kept separate from `FEATURE_MATRIX` on purpose: that table is the *technical*
 * gate (which permission, which tier, what happens on denial), while this is the
 * *marketing* list and its order is a copy decision. Where they overlap, the
 * `feature` key links a row back to its gate so the two cannot silently drift.
 */
import {
  BarChart3Icon,
  CloudIcon,
  ClipboardListIcon,
  LifeBuoyIcon,
  PackageIcon,
  SparklesIcon,
} from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import type { GatedFeature } from '@/lib/subscriptions/feature-gate';

export type ProFeatureRow = {
  id: string;
  label: string;
  detail: string;
  icon: React.ComponentType<IconProps>;
  /** The gate this row corresponds to, when there is one. */
  feature: GatedFeature | null;
};

export const PRO_FEATURE_ROWS: ProFeatureRow[] = [
  {
    id: 'inventory',
    label: 'Inventory without limits',
    detail: 'Parts, engines and locations with no record cap',
    icon: PackageIcon,
    feature: 'unlimited_inventory',
  },
  {
    id: 'ai',
    label: 'AI-powered workflows',
    detail: 'Scan and import documents and photos',
    icon: SparklesIcon,
    feature: 'unlimited_ai',
  },
  {
    id: 'work_orders',
    label: 'Complete work orders',
    detail: 'Track every job with full history',
    icon: ClipboardListIcon,
    feature: 'unlimited_work_orders',
  },
  {
    id: 'reports',
    label: 'Advanced reports',
    detail: 'Margin, turnover and payroll analytics',
    icon: BarChart3Icon,
    feature: 'advanced_reports',
  },
  {
    id: 'api',
    label: 'API access',
    detail: 'Connect AutoCore to your own tools',
    icon: CloudIcon,
    feature: 'api_access',
  },
  {
    id: 'support',
    label: 'Priority support',
    detail: 'Direct line to the team, faster responses',
    icon: LifeBuoyIcon,
    feature: 'priority_support',
  },
];

/** Four lines on the paywall — conversion screens do not list every gate. */
export const PAYWALL_FEATURE_ROWS = PRO_FEATURE_ROWS.slice(0, 4);

export const LEGAL_URLS = {
  terms: 'https://myautocore.com/terms',
  privacy: 'https://myautocore.com/privacy',
} as const;
