/**
 * The Pro value proposition, as shown on the paywall.
 *
 * Kept separate from `FEATURE_MATRIX` on purpose: that table is the *technical*
 * gate (which permission, which tier, what happens on denial), while this is the
 * *marketing* list and its order is a copy decision. Where they overlap, the
 * `feature` key links a row back to its gate so the two cannot silently drift.
 *
 * App Store guideline 3.1.2(c) requires this list (or an equivalent functional
 * description) to appear on the purchase screen itself — price and duration
 * alone are not enough. `paywall-screen.tsx` must render `PaywallIncludes`.
 */
import {
  FileTextIcon,
  LifeBuoyIcon,
  PackageIcon,
  SparklesIcon,
  UsersIcon,
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

/**
 * What Pro actually unlocks.
 *
 * Every row here is enforced. That is not a style note — the previous list sold
 * "inventory without limits", "complete work orders", "advanced reports" and
 * "API access", none of which the free tier is limited on and one of which
 * (API access) does not exist in the product. Anyone who tapped "Not now" got
 * all four for free, so the paywall was charging for things it was already
 * giving away, and App Store guideline 2.3.1 treats a purchase screen that
 * describes non-existent features as misleading.
 *
 * The rule for adding a row: point at the code that refuses the action without
 * Pro. Each entry below names its enforcement point.
 */
export const PRO_FEATURE_ROWS: ProFeatureRow[] = [
  {
    id: 'team',
    label: 'Team and roles',
    detail: 'Invite employees and control what each person can see',
    icon: UsersIcon,
    // src/lib/auth/verify-company-manager.server.ts → 402 without Pro,
    // plus the client `FeatureGate` on the Team screen.
    feature: 'team_management',
  },
  {
    id: 'documents',
    label: 'Documents and PDFs',
    detail: 'Generate invoices, acts and warranty documents',
    icon: FileTextIcon,
    // src/lib/documents/verify-document-access.ts → 402 without Pro.
    feature: 'document_export',
  },
  {
    id: 'ai_documents',
    label: 'AI paperwork',
    detail: 'Let the assistant prepare a job’s documents for you',
    icon: SparklesIcon,
    // src/lib/ai/tools/documents.server.ts refuses without Pro.
    feature: 'document_export',
  },
  {
    id: 'bulk_import',
    label: 'Bulk import',
    detail: 'Move spreadsheets and supplier files into your workspace',
    icon: PackageIcon,
    // src/lib/auth/verify-inventory-import-access.server.ts → 402 without Pro.
    feature: 'bulk_import',
  },
  {
    id: 'support',
    label: 'Priority support',
    detail: 'Direct line to the team, faster responses',
    icon: LifeBuoyIcon,
    // A commitment the team keeps, not a code gate — the one row here that
    // software cannot enforce, and it stays only while that promise holds.
    feature: 'priority_support',
  },
];

/** Display name of the auto-renewable subscription, as shown on the paywall. */
export const PAYWALL_PRODUCT_NAME = 'AutoCore Pro';

export const PAYWALL_INCLUDES_HEADING = 'What AutoCore Pro includes';

/**
 * Settings upgrade row. Kept to the same claims as `PRO_FEATURE_ROWS` — the
 * previous line sold unlimited engines, work orders, AI and reports, which
 * the free tier already has.
 */
export const PAYWALL_UPGRADE_SUBTITLE = 'Team, documents, bulk import and priority support';

/**
 * Functional description of the subscription contents.
 *
 * Used as the VoiceOver summary on the paywall. The on-screen list is the
 * same data, one row at a time. Guideline 3.1.2(c) is the reason this exists.
 */
export function describeSubscriptionContents(): string {
  const items = PRO_FEATURE_ROWS.map((row) => `${row.label}: ${row.detail}`).join('. ');
  return `${PAYWALL_INCLUDES_HEADING}. ${items}.`;
}

/**
 * Paste into App Store Connect → Subscriptions → each AutoCore Pro product
 * → Localization → Description. Reviewers read that field independently of
 * the binary; an empty or generic description is the same 3.1.2(c) rejection
 * as a paywall that only shows a price.
 */
export function appStoreConnectSubscriptionDescription(): string {
  const items = PRO_FEATURE_ROWS.map((row) => `${row.label} (${row.detail})`).join('; ');
  return (
    `${PAYWALL_PRODUCT_NAME} is an auto-renewable subscription. It includes ${items}. ` +
    'Choose monthly or yearly billing. Payment is charged to the Apple ID account at confirmation. ' +
    'The subscription renews unless cancelled at least 24 hours before the end of the current period.'
  );
}

/**
 * Same company on a computer — the one piece of new information the
 * post-purchase screen carries, so it is a line of copy rather than a card.
 */
export const WEB_WORKSPACE_HINT = {
  label: 'Same workspace on the web',
  domain: 'app.myautocore.com',
} as const;

/** Re-exported so the paywall and Settings cannot drift onto different URLs. */
export { LEGAL_URLS } from '@/lib/legal/legal-urls';
