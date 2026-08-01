import type { ComponentType } from 'react';

import {
  BellIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
  WrenchIcon,
} from '@/assets/icons';

import type { SettingsHubRouteId } from '../types';

export type SettingsHubRowDef = {
  id: SettingsHubRouteId;
  title: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export type SettingsHubSectionDef = {
  id: string;
  label: string;
  rows: SettingsHubRowDef[];
};

export const SETTINGS_HUB_SECTIONS: SettingsHubSectionDef[] = [
  {
    id: 'account',
    label: 'Account',
    rows: [
      { id: 'edit-profile', title: 'Edit Profile', icon: UserRoundIcon },
      { id: 'security', title: 'Security', icon: HelpCircleIcon },
      { id: 'notifications', title: 'Notifications', icon: BellIcon },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    rows: [
      { id: 'company', title: 'Company', icon: StoreIcon },
      { id: 'team', title: 'Team', icon: UsersIcon },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    rows: [
      { id: 'appearance', title: 'Theme', icon: SparklesIcon },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    rows: [{ id: 'finance', title: 'Accounting', icon: ReceiptIcon }],
  },
  {
    id: 'system',
    label: 'System',
    rows: [
      { id: 'version', title: 'Version', icon: SettingsIcon },
      { id: 'advanced', title: 'Advanced', icon: WrenchIcon },
    ],
  },
];
