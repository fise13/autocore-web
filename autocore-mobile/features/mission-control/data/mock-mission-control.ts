import {
  BarChart3Icon,
  BoxIcon,
  CarIcon,
  ClipboardListIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ScanSearchIcon,
  SearchIcon,
  TagIcon,
} from '@/assets/icons';

import type { MissionControlSnapshot } from '../types';

export const mockMissionControlSnapshot: MissionControlSnapshot = {
  attention: {
    title: 'Нужно действие',
    items: [
      { count: 3, text: 'на исходе', tone: 'warning' },
      { count: 2, text: 'ждут запчасти', tone: 'danger' },
    ],
  },
  revenue: {
    label: 'Общий баланс',
    value: 5_100_000,
    growthPercent: 96.6,
    todayNet: 500_000,
    todayIncome: 682_209,
    todayExpense: 182_209,
    weekBars: [
      { label: 'пн', value: 42_000 },
      { label: 'вт', value: 58_000 },
      { label: 'ср', value: 51_000 },
      { label: 'чт', value: 72_000 },
      { label: 'пт', value: 88_000 },
      { label: 'сб', value: 95_000 },
      { label: 'вс', value: 118_000 },
    ],
  },
  statTiles: [
    { id: 'orders', label: 'Новые наряды', value: 24, format: 'integer', icon: ClipboardListIcon },
    { id: 'stock', label: 'Позиций на складе', value: 1284, format: 'grouped', icon: BoxIcon },
  ],
  quickActions: [
    { id: 'order', label: 'Наряд', icon: PlusIcon, route: '/(tabs)/orders/new' },
    { id: 'scan', label: 'Скан', icon: ScanSearchIcon, route: '/(tabs)/scan' },
    { id: 'inventory', label: 'Склад', icon: BoxIcon, route: '/(tabs)/warehouse' },
    { id: 'finance', label: 'Финансы', icon: BarChart3Icon, route: '/(tabs)/accounting' },
  ],
  featuredInsight: {
    id: 'pricing',
    title: '3 мотора ниже рыночной цены',
    detail: 'Пересмотрите цены на залежавшиеся позиции.',
    body: 'Обновление цен может ускорить продажи на 15–20%.',
    cta: 'Смотреть рекомендации',
    tone: 'neutral',
  },
  insights: [
    {
      id: 'pace',
      title: 'Хороший темп',
      detail: '62% нарядов закрыто',
      tone: 'positive',
    },
  ],
  activity: [
    {
      id: '1',
      title: '№1042',
      detail: 'BMW N47',
      time: '4 мин назад',
      statusLabel: 'Резерв',
      statusTone: 'default',
      category: 'reservation',
      icon: TagIcon,
    },
    {
      id: '2',
      title: '№1038',
      detail: 'Audi CAGA',
      time: '18 мин назад',
      statusLabel: 'Гарантия',
      statusTone: 'warning',
      category: 'warranty',
      icon: ReceiptIcon,
    },
    {
      id: '3',
      title: '№1031',
      detail: '185 000 ₽',
      time: '42 мин назад',
      statusLabel: 'Продажа',
      statusTone: 'success',
      category: 'sale',
      icon: CarIcon,
    },
    {
      id: '4',
      title: '№1024',
      detail: 'Toyota 2AD',
      time: '1 ч назад',
      statusLabel: 'Выполнен',
      statusTone: 'success',
      category: 'order',
      icon: ClipboardListIcon,
    },
    {
      id: '5',
      title: 'Склад',
      detail: '+24 фильтра Mann',
      time: '2 ч назад',
      statusLabel: 'Приёмка',
      statusTone: 'muted',
      category: 'inventory',
      icon: PackageIcon,
    },
  ],
  companies: [
    { id: '1', name: 'AutoCore Demo', role: 'Администратор' },
    { id: '2', name: 'МоторТех СПб', role: 'Менеджер' },
  ],
};

export const mockCompanies = mockMissionControlSnapshot.companies;
