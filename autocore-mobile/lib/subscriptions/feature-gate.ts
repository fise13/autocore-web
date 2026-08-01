/**
 * FeatureGate service — L5.
 *
 * Access is the conjunction of two orthogonal axes:
 *
 *     access = RBAC.can(permission)  AND  tier >= requiredTier
 *
 * "Is this person allowed?" and "does this company pay for it?" are different
 * questions with different answers and different remedies. Conflating them
 * shows paywalls to mechanics who could never use the feature anyway, so the
 * denial reason is carried through and each one gets its own UI.
 *
 * This table is the single place a premium check is declared. Nothing else in
 * the app compares a tier by hand.
 */
import type { Permission } from '@autocore/rbac';

import {
  BarChart3Icon,
  CloudIcon,
  ClipboardListIcon,
  FileTextIcon,
  LifeBuoyIcon,
  PackageIcon,
  SparklesIcon,
  UsersIcon,
} from '@/assets/icons';
import type { IconProps } from '@/assets/icons';

import { tierSatisfies } from './catalog';
import type { GateResult, SubscriptionTier } from './types';

export type GatedFeature =
  | 'team_management'
  | 'invites'
  | 'advanced_reports'
  | 'unlimited_inventory'
  | 'unlimited_work_orders'
  | 'unlimited_ai'
  | 'document_export'
  | 'bulk_import'
  | 'api_access'
  | 'priority_support'
  | 'audit_log';

export type FeatureRule = {
  requiredTier: SubscriptionTier;
  /** RBAC permission required in addition to the entitlement. */
  permission: Permission | null;
  /** Copy shown when the gate denies for `entitlement_required`. */
  paywall: {
    title: string;
    body: string;
  };
  icon: React.ComponentType<IconProps>;
};

export const FEATURE_MATRIX: Record<GatedFeature, FeatureRule> = {
  unlimited_inventory: {
    requiredTier: 'pro',
    permission: 'inventory_view',
    icon: PackageIcon,
    paywall: {
      title: 'Unlimited inventory',
      body: 'Track every part, engine and location without a cap on records.',
    },
  },
  unlimited_ai: {
    requiredTier: 'pro',
    permission: null,
    icon: SparklesIcon,
    paywall: {
      title: 'Unlimited AI',
      body: 'Scan, extract and import documents and photos without monthly limits.',
    },
  },
  unlimited_work_orders: {
    requiredTier: 'pro',
    permission: 'work_orders_view',
    icon: ClipboardListIcon,
    paywall: {
      title: 'Unlimited work orders',
      body: 'Open as many jobs as your shop can handle, with full history.',
    },
  },
  advanced_reports: {
    requiredTier: 'pro',
    permission: 'analytics_view',
    icon: BarChart3Icon,
    paywall: {
      title: 'Advanced reports',
      body: 'Margin, turnover and payroll analytics across every workspace.',
    },
  },
  api_access: {
    requiredTier: 'pro',
    permission: 'settings_manage',
    icon: CloudIcon,
    paywall: {
      title: 'API access',
      body: 'Connect AutoCore to your own tools with authenticated API keys.',
    },
  },
  priority_support: {
    requiredTier: 'pro',
    permission: null,
    icon: LifeBuoyIcon,
    paywall: {
      title: 'Priority support',
      body: 'Direct line to the team with priority response times.',
    },
  },
  team_management: {
    requiredTier: 'pro',
    permission: 'employee_view',
    icon: UsersIcon,
    paywall: {
      title: 'Team and roles',
      body: 'Add employees, assign roles and control what each person can see.',
    },
  },
  invites: {
    requiredTier: 'pro',
    permission: 'employee_manage',
    icon: UsersIcon,
    paywall: {
      title: 'Employee invitations',
      body: 'Invite your team with codes and manage their access from the app.',
    },
  },
  document_export: {
    requiredTier: 'pro',
    permission: 'export_data',
    icon: FileTextIcon,
    paywall: {
      title: 'Document export',
      body: 'Generate and export invoices, acts and warranty documents as PDF.',
    },
  },
  bulk_import: {
    requiredTier: 'pro',
    permission: 'import_data',
    icon: PackageIcon,
    paywall: {
      title: 'Bulk import',
      body: 'Import spreadsheets, archives and supplier documents in one pass.',
    },
  },
  audit_log: {
    requiredTier: 'enterprise',
    permission: 'settings_manage',
    icon: FileTextIcon,
    paywall: {
      title: 'Audit log',
      body: 'Full activity history across the workspace, retained and searchable.',
    },
  },
};

export function featureRule(feature: GatedFeature): FeatureRule {
  return FEATURE_MATRIX[feature];
}

export type EvaluateGateInput = {
  feature: GatedFeature;
  tier: SubscriptionTier;
  /** RBAC check, injected so this stays free of React and session imports. */
  can: (permission: Permission) => boolean;
  /** Company module toggle, when the feature belongs to a disableable module. */
  moduleEnabled?: boolean;
};

/**
 * Evaluate a gate.
 *
 * Permission is checked **before** entitlement on purpose: someone who could
 * never use the feature should be told that, not sold an upgrade.
 */
export function evaluateGate({
  feature,
  tier,
  can,
  moduleEnabled = true,
}: EvaluateGateInput): GateResult {
  const rule = FEATURE_MATRIX[feature];

  if (rule.permission && !can(rule.permission)) {
    return { allowed: false, reason: 'permission_denied', requiredTier: rule.requiredTier };
  }

  if (!moduleEnabled) {
    return { allowed: false, reason: 'module_disabled', requiredTier: rule.requiredTier };
  }

  if (!tierSatisfies(tier, rule.requiredTier)) {
    return { allowed: false, reason: 'entitlement_required', requiredTier: rule.requiredTier };
  }

  return { allowed: true, reason: null, requiredTier: rule.requiredTier };
}

/** Thrown by `assertFeature` so a handler can bail without its own branching. */
export class FeatureLockedError extends Error {
  feature: GatedFeature;
  reason: GateResult['reason'];

  constructor(feature: GatedFeature, reason: GateResult['reason']) {
    super(`Feature "${feature}" is locked: ${reason ?? 'unknown'}`);
    this.name = 'FeatureLockedError';
    this.feature = feature;
    this.reason = reason;
  }
}
