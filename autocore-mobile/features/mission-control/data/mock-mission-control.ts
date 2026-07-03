import {
  CarIcon,
  ClipboardListIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ScanSearchIcon,
  SearchIcon,
  ShoppingCartIcon,
  TagIcon,
} from '@/assets/icons';

import type { MissionControlSnapshot } from '../types';

export const mockMissionControlSnapshot: MissionControlSnapshot = {
  attention: {
    title: 'Требует внимания',
    items: [
      { count: 3, text: 'двигателя заканчиваются', tone: 'warning' },
      { count: 2, text: 'просроченных наряда', tone: 'danger' },
      { count: 1, text: 'гарантия истекает завтра', tone: 'warning' },
    ],
  },
  overview: [
    {
      id: 'sales',
      label: 'Продажи',
      value: '284 500 ₽',
      numericValue: 284_500,
      hint: '↑ 12%',
      hintTone: 'success',
      trend: [42, 48, 44, 52, 49, 58, 55, 62],
      trendTone: 'primary',
    },
    {
      id: 'orders',
      label: 'Наряды',
      value: '12',
      numericValue: 12,
      hint: '4 в работе',
      hintTone: 'muted',
      trend: [8, 9, 10, 11, 10, 12, 11, 12],
      trendTone: 'success',
    },
    {
      id: 'reservations',
      label: 'Резервы',
      value: '5',
      numericValue: 5,
      hint: '2 сегодня',
      hintTone: 'muted',
      trend: [3, 4, 3, 5, 4, 5, 4, 5],
      trendTone: 'chart2',
    },
    {
      id: 'warehouse',
      label: 'Склад',
      value: '4 892',
      numericValue: 4_892,
      hint: 'позиции',
      hintTone: 'muted',
      trend: [4800, 4820, 4850, 4860, 4875, 4885, 4890, 4892],
      trendTone: 'muted',
    },
  ],
  quickActions: [
    { id: 'scan', label: 'Сканировать QR', icon: ScanSearchIcon, route: '/(tabs)/scan', primary: true },
    { id: 'order', label: 'Новый наряд', icon: PlusIcon, route: '/(tabs)/orders' },
    { id: 'search', label: 'Поиск', icon: SearchIcon, route: '/(tabs)/search' },
    { id: 'sale', label: 'Продажа', icon: ShoppingCartIcon },
  ],
  activity: [
    {
      id: '1',
      title: 'Создана бронь',
      detail: 'BMW N47',
      time: '4 мин назад',
      category: 'reservation',
      icon: TagIcon,
    },
    {
      id: '2',
      title: 'Гарантия оформлена',
      detail: 'Audi CAGA',
      time: '18 мин назад',
      category: 'warranty',
      icon: ReceiptIcon,
    },
    {
      id: '3',
      title: 'Двигатель продан',
      detail: '185 000 ₽',
      time: '42 мин назад',
      category: 'sale',
      icon: CarIcon,
    },
    {
      id: '4',
      title: 'Наряд закрыт',
      detail: 'Toyota 2AD',
      time: '1 ч назад',
      category: 'order',
      icon: ClipboardListIcon,
    },
    {
      id: '5',
      title: 'Склад обновлён',
      detail: '+24 фильтра Mann',
      time: '2 ч назад',
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
