import {
  BoxIcon,
  CarIcon,
  ClipboardListIcon,
  PackageIcon,
  ReceiptIcon,
  TagIcon,
} from '@/assets/icons';

import type { OverviewSnapshot } from '../types';

export const mockOverviewSnapshot: OverviewSnapshot = {
  attention: {
    title: 'Attention',
    items: [
      { count: 3, text: 'running low', tone: 'warning' },
      { count: 2, text: 'waiting on parts', tone: 'danger' },
    ],
  },
  revenue: {
    label: 'Revenue · This week',
    value: 5_100_000,
    growthPercent: 18.2,
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
    { id: 'orders', label: 'New orders', value: 24, format: 'integer', icon: ClipboardListIcon },
    { id: 'stock', label: 'Parts in stock', value: 1284, format: 'grouped', icon: BoxIcon },
  ],
  featuredInsight: {
    id: 'pricing',
    category: 'Pricing',
    sf: 'sparkles',
    title: '3 engines are priced below market',
    insight:
      '3 engines are priced below market. Increasing the BMW N57 listing by 12% could add meaningful margin based on current demand.',
    body: 'Increasing the BMW N57 listing by 12% could add meaningful margin based on current demand.',
    cta: 'Review suggestions',
    tone: 'neutral',
    // Alert without a historical series → no chart
    chart: null,
  },
  insights: [
    {
      id: 'pace',
      category: 'Close rate',
      sf: 'chart.xyaxis.line',
      title: '62% closed',
      insight: '62% of work orders closed this period.',
      detail: 'Work orders this period',
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

export const mockCompanies = mockOverviewSnapshot.companies;
