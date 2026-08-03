import {
  BellIcon,
  CoinsIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
} from '@/assets/icons';

import type { ProfileSnapshot } from '../types';

export const mockProfileSnapshot: ProfileSnapshot = {
  user: {
    id: 'mock-user',
    name: 'Victor Mishkin',
    email: 'victor@email.com',
    role: 'Owner',
    company: 'MotorLand',
    loginProvider: 'Google',
  },
  quickActions: [
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      subtitle: 'Name, email, photo',
      icon: UserRoundIcon,
    },
    {
      id: 'company',
      title: 'Company',
      subtitle: 'MotorLand Pro',
      icon: StoreIcon,
    },
    {
      id: 'subscription',
      title: 'Subscription',
      subtitle: 'Pro · renews July 25',
      icon: ReceiptIcon,
    },
    {
      id: 'team',
      title: 'Team',
      subtitle: '12 employees',
      icon: UsersIcon,
    },
  ],
  preferences: [
    {
      id: 'appearance',
      title: 'Appearance',
      value: 'Auto',
      icon: SparklesIcon,
    },
    {
      id: 'language',
      title: 'Language',
      value: 'English',
      icon: SettingsIcon,
    },
    {
      id: 'currency',
      title: 'Currency',
      value: 'USD',
      icon: CoinsIcon,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      value: 'On',
      icon: BellIcon,
    },
  ],
  workspace: [
    { id: 'workspace-company', title: 'Company', value: 'MotorLand' },
    { id: 'workspace-plan', title: 'Plan', value: 'Pro' },
    { id: 'workspace-employees', title: 'Employees', value: '12' },
    { id: 'workspace-permissions', title: 'Permissions', value: 'Owner' },
  ],
  dangerZone: [
    { id: 'delete-company', title: 'Delete Company' },
    { id: 'delete-accounting', title: 'Delete Accounting' },
    { id: 'delete-warehouse', title: 'Delete Warehouse' },
    { id: 'delete-catalog', title: 'Delete Catalog' },
  ],
};

export const profileRouteTitles: Record<string, { title: string; subtitle?: string }> = {
  'edit-profile': { title: 'Edit Profile', subtitle: 'Name, email, and photo' },
  company: { title: 'Company', subtitle: 'MotorLand Pro' },
  subscription: { title: 'Subscription', subtitle: 'Pro Plan' },
  team: { title: 'Team', subtitle: '12 employees' },
  appearance: { title: 'Appearance', subtitle: 'Interface theme' },
  language: { title: 'Language', subtitle: 'App language' },
  currency: { title: 'Currency', subtitle: 'Default currency' },
  notifications: { title: 'Notifications', subtitle: 'Push and email' },
  'workspace-company': { title: 'Company', subtitle: 'Workspace' },
  'workspace-plan': { title: 'Plan', subtitle: 'Tier and limits' },
  'workspace-employees': { title: 'Employees', subtitle: 'Team access' },
  'workspace-permissions': { title: 'Permissions', subtitle: 'Roles and access' },
};
