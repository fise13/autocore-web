import type { ComponentType } from 'react';

import type { IconName } from '@/assets/icons';

export type SettingsRouteId =
  | 'account'
  | 'workspace'
  | 'modules'
  | 'company'
  | 'team'
  | 'accounting'
  | 'finance'
  | 'appearance'
  | 'notifications'
  | 'advanced'
  | 'edit-profile'
  | 'subscription'
  | 'language'
  | 'currency'
  | 'security'
  | 'taxes'
  | 'cache'
  | 'diagnostics'
  | 'version';

export type SettingsHubRouteId = SettingsRouteId;

export type SettingsHubSectionId = SettingsRouteId;

export type NavItemId =
  | 'mission'
  | 'search'
  | 'scan'
  | 'orders'
  | 'my_earnings'
  | 'profile'
  | 'accounting'
  | 'warehouse'
  | 'sales'
  | 'documents'
  | 'inventory'
  | 'settings';

export type ProductModuleId =
  | 'engines'
  | 'orders'
  | 'warehouse'
  | 'sales'
  | 'accounting'
  | 'documents'
  | 'expenses'
  | 'parts'
  | 'gearboxes'
  | 'warranty'
  | 'analytics';

export type NavItemConfig = {
  id: NavItemId;
  enabled: boolean;
};

export type ProductModuleConfig = {
  id: ProductModuleId;
  enabled: boolean;
};

export type SettingsHubCard = {
  id: SettingsHubSectionId;
  title: string;
  subtitle: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'pro';
};

export type SettingsRowModel = {
  id: string;
  label: string;
  value?: string;
  subtitle?: string;
  icon?: IconName;
};

export type PermissionGroupId =
  | 'warehouse'
  | 'sales'
  | 'orders'
  | 'accounting'
  | 'analytics'
  | 'documents'
  | 'settings'
  | 'admin';

export type DemoPermission = {
  id: string;
  label: string;
  description: string;
};

export type AccentColorId = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose';

export type AppearanceSettings = {
  accentColor: AccentColorId;
  animationsEnabled: boolean;
  compactMode: boolean;
  largeText: boolean;
};
