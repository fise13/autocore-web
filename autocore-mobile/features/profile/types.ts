import type { ComponentType } from 'react';

import type { SettingsHubSectionId } from '@/features/settings/types';

export type ProfileRouteId =
  | 'edit-profile'
  | 'company'
  | 'subscription'
  | 'team'
  | 'appearance'
  | 'language'
  | 'currency'
  | 'notifications'
  | 'workspace-company'
  | 'workspace-plan'
  | 'workspace-employees'
  | 'workspace-permissions';

export type ProfileHubRouteId = ProfileRouteId | SettingsHubSectionId;

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
  id: ProfileRouteId;
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
  workspaceSettings: ProfilePreferenceRow[];
  configuration: ProfilePreferenceRow[];
  business: ProfilePreferenceRow[];
  appSettings: ProfilePreferenceRow[];
  system: ProfilePreferenceRow[];
};
