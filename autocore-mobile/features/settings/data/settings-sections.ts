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
    label: 'Аккаунт',
    rows: [
      { id: 'edit-profile', title: 'Редактировать профиль', icon: UserRoundIcon },
      { id: 'security', title: 'Безопасность', icon: HelpCircleIcon },
      { id: 'notifications', title: 'Уведомления', icon: BellIcon },
    ],
  },
  {
    id: 'company',
    label: 'Компания',
    rows: [
      { id: 'company', title: 'Компания', icon: StoreIcon },
      { id: 'team', title: 'Команда', icon: UsersIcon },
    ],
  },
  {
    id: 'appearance',
    label: 'Оформление',
    rows: [
      { id: 'appearance', title: 'Тема', icon: SparklesIcon },
      { id: 'navigation', title: 'Навигация', icon: LayoutGridIcon },
    ],
  },
  {
    id: 'finance',
    label: 'Финансы',
    rows: [{ id: 'finance', title: 'Бухгалтерия', icon: ReceiptIcon }],
  },
  {
    id: 'system',
    label: 'Система',
    rows: [
      { id: 'version', title: 'Версия', icon: SettingsIcon },
      { id: 'advanced', title: 'Расширенные', icon: WrenchIcon },
    ],
  },
];
