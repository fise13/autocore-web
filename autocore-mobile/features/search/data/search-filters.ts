import type { SearchFilterOption } from '../types';

export const searchFilters: SearchFilterOption[] = [
  { id: 'all', label: 'Все' },
  { id: 'parts', label: 'Склад' },
  { id: 'motors', label: 'Моторы' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'orders', label: 'Заказы' },
];
