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
    title: 'Needs attention',
    items: [
      { count: 3, text: 'running low', tone: 'warning' },
      { count: 2, text: 'waiting on parts', tone: 'danger' },
    ],
  },
  revenue: {
    label: 'Total balance',
    value: 5_100_000,
    growthPercent: 96.6,
    todayNet: 500_000,
    todayIncome: 682_209,
    todayExpense: 182_209,
    weekBars: [
      { label: 'Mon', value: 42_000 },
      { label: 'Tue', value: 58_000 },
      { label: 'Wed', value: 51_000 },
      { label: 'Thu', value: 72_000 },
      { label: 'Fri', value: 88_000 },
      { label: 'Sat', value: 95_000 },
      { label: 'Sun', value: 118_000 },
    ],
  },
  statTiles: [
    { id: 'orders', label: 'New work orders', value: 24, format: 'integer', icon: ClipboardListIcon },
    { id: 'stock', label: 'Items in stock', value: 1284, format: 'grouped', icon: BoxIcon },
  ],
  quickActions: [
    { id: 'order', label: 'Order', icon: PlusIcon, route: '/(tabs)/orders/new' },
    { id: 'scan', label: 'Scan', icon: ScanSearchIcon, route: '/(tabs)/scan' },
    { id: 'inventory', label: 'Warehouse', icon: BoxIcon, route: '/(tabs)/warehouse' },
    { id: 'finance', label: 'Finance', icon: BarChart3Icon, route: '/(tabs)/accounting' },
  ],
  featuredInsight: {
    id: 'pricing',
    title: '3 engines priced below market',
    detail: 'Revisit pricing on slow-moving items.',
    body: 'Updating prices could speed up sales by 15–20%.',
    cta: 'View recommendations',
    tone: 'neutral',
  },
  insights: [
    {
      id: 'pace',
      title: 'Good pace',
      detail: '62% of work orders closed',
      tone: 'positive',
    },
  ],
  activity: [
    {
      id: '1',
      title: '#1042',
      detail: 'BMW N47',
      time: '4 min ago',
      statusLabel: 'Reserved',
      statusTone: 'default',
      category: 'reservation',
      icon: TagIcon,
    },
    {
      id: '2',
      title: '#1038',
      detail: 'Audi CAGA',
      time: '18 min ago',
      statusLabel: 'Warranty',
      statusTone: 'warning',
      category: 'warranty',
      icon: ReceiptIcon,
    },
    {
      id: '3',
      title: '#1031',
      detail: '$185,000',
      time: '42 min ago',
      statusLabel: 'Sold',
      statusTone: 'success',
      category: 'sale',
      icon: CarIcon,
    },
    {
      id: '4',
      title: '#1024',
      detail: 'Toyota 2AD',
      time: '1 hr ago',
      statusLabel: 'Completed',
      statusTone: 'success',
      category: 'order',
      icon: ClipboardListIcon,
    },
    {
      id: '5',
      title: 'Warehouse',
      detail: '+24 Mann filters',
      time: '2 hr ago',
      statusLabel: 'Received',
      statusTone: 'muted',
      category: 'inventory',
      icon: PackageIcon,
    },
  ],
  companies: [
    { id: '1', name: 'AutoCore Demo', role: 'Admin' },
    { id: '2', name: 'MotorTech SPB', role: 'Manager' },
  ],
};

export const mockCompanies = mockMissionControlSnapshot.companies;
