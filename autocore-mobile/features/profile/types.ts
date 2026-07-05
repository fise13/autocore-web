import type { ComponentType } from 'react';

import type { SettingsHubRouteId } from '@/features/settings/types';

export type ProfileRouteId =
  | 'edit-profile'
  | 'company'
  | 'subscription'
  | 'team'
  | 'appearance'
  | 'language'
  | 'currency'
  | 'notifications'
  | 'security'
  | 'taxes'
  | 'cache'
  | 'diagnostics'
  | 'version'
  | 'finance';

export type ProfileHubRouteId = ProfileRouteId | SettingsHubRouteId;

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  loginProvider: string;
  photoURL?: string | null;
  isPro?: boolean;
  planLabel?: string;
};

export type ProfileQuickAction = {
  id: ProfileRouteId;
  title: string;
  subtitle: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export type ProfilePreferenceRow = {
  id: ProfileHubRouteId;
  title: string;
  value: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export type ProfileWorkspaceRow = {
  id: ProfileRouteId | 'workspace-company' | 'workspace-plan' | 'workspace-employees' | 'workspace-permissions';
  title: string;
  value: string;
  companyId?: string;
};

export type ProfileDangerAction = {
  id: string;
  title: string;
};

export type ProfileSnapshot = {
  user: ProfileUser;
  quickActions: ProfileQuickAction[];
  preferences: ProfilePreferenceRow[];
  workspace: ProfileWorkspaceRow[];
  dangerZone: ProfileDangerAction[];
};

export type ProfileHubData = ProfileSnapshot & {
  /** Optional trailing values for settings hub rows */
  rowValues: Partial<Record<SettingsHubRouteId, string>>;
};
