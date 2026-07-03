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
    role: 'Владелец',
    company: 'MotorLand',
    loginProvider: 'Google',
  },
  quickActions: [
    {
      id: 'edit-profile',
      title: 'Редактировать профиль',
      subtitle: 'Имя, email, фото',
      icon: UserRoundIcon,
    },
    {
      id: 'company',
      title: 'Компания',
      subtitle: 'MotorLand Pro',
      icon: StoreIcon,
    },
    {
      id: 'subscription',
      title: 'Подписка',
      subtitle: 'Pro · списание 25 июля',
      icon: ReceiptIcon,
    },
    {
      id: 'team',
      title: 'Команда',
      subtitle: '12 сотрудников',
      icon: UsersIcon,
    },
  ],
  preferences: [
    {
      id: 'appearance',
      title: 'Оформление',
      value: 'Авто',
      icon: SparklesIcon,
    },
    {
      id: 'language',
      title: 'Язык',
      value: 'Русский',
      icon: SettingsIcon,
    },
    {
      id: 'currency',
      title: 'Валюта',
      value: 'KZT',
      icon: CoinsIcon,
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      value: 'Включены',
      icon: BellIcon,
    },
  ],
  workspace: [
    { id: 'workspace-company', title: 'Компания', value: 'MotorLand' },
    { id: 'workspace-plan', title: 'План', value: 'Pro' },
    { id: 'workspace-employees', title: 'Сотрудники', value: '12' },
    { id: 'workspace-permissions', title: 'Права', value: 'Владелец' },
  ],
  dangerZone: [
    { id: 'delete-company', title: 'Удалить компанию' },
    { id: 'delete-accounting', title: 'Удалить бухгалтерию' },
    { id: 'delete-warehouse', title: 'Удалить склад' },
    { id: 'delete-catalog', title: 'Удалить каталог' },
  ],
};

export const profileRouteTitles: Record<string, { title: string; subtitle?: string }> = {
  'edit-profile': { title: 'Редактировать профиль', subtitle: 'Имя, email и фото' },
  company: { title: 'Компания', subtitle: 'MotorLand Pro' },
  subscription: { title: 'Подписка', subtitle: 'Pro Plan' },
  team: { title: 'Команда', subtitle: '12 сотрудников' },
  appearance: { title: 'Оформление', subtitle: 'Тема интерфейса' },
  language: { title: 'Язык', subtitle: 'Язык приложения' },
  currency: { title: 'Валюта', subtitle: 'Валюта по умолчанию' },
  notifications: { title: 'Уведомления', subtitle: 'Push и email' },
  'workspace-company': { title: 'Компания', subtitle: 'Рабочее пространство' },
  'workspace-plan': { title: 'План', subtitle: 'Тариф и лимиты' },
  'workspace-employees': { title: 'Сотрудники', subtitle: 'Доступ команды' },
  'workspace-permissions': { title: 'Права', subtitle: 'Роли и доступ' },
};
