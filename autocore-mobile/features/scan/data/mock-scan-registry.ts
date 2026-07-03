import type { RecentScan, ScanResult } from '../types';

const registry = new Map<string, ScanResult>([
  [
    'EJ205',
    {
      id: 'eng-ej205',
      kind: 'engine',
      code: 'EJ205',
      title: 'EJ205',
      subtitle: 'Subaru WRX STI',
      shelf: 'A-14',
      status: 'in_stock',
      price: 420_000,
      vin: 'JN1CV6EK0BM215487',
    },
  ],
  [
    'OM651',
    {
      id: 'eng-om651',
      kind: 'engine',
      code: 'OM651',
      title: 'OM651',
      subtitle: 'Mercedes E220 CDI',
      shelf: 'B-08',
      status: 'reserved',
      price: 385_000,
      vin: 'WDD2120021A123456',
    },
  ],
  [
    'EA888',
    {
      id: 'eng-ea888',
      kind: 'engine',
      code: 'EA888',
      title: 'EA888',
      subtitle: 'Audi A6 2.0 TFSI',
      shelf: 'A-21',
      status: 'in_stock',
      price: 610_000,
      vin: 'WAUZZZ4G5DN123456',
    },
  ],
  [
    'N47',
    {
      id: 'eng-n47',
      kind: 'engine',
      code: 'N47',
      title: 'N47',
      subtitle: 'BMW 320d',
      shelf: 'C-11',
      status: 'deficit',
      price: 520_000,
      vin: 'WBA3B1C50EK123456',
    },
  ],
  [
    '2AD',
    {
      id: 'eng-2ad',
      kind: 'engine',
      code: '2AD',
      title: 'Toyota 2AD',
      subtitle: 'Toyota Hilux',
      shelf: 'D-04',
      status: 'ready',
      price: 445_000,
    },
  ],
  [
    'DQ250',
    {
      id: 'gb-dq250',
      kind: 'transmission',
      code: 'DQ250',
      title: 'DQ250',
      subtitle: 'VW DSG 6-speed',
      shelf: 'E-02',
      status: 'in_stock',
      price: 185_000,
    },
  ],
  [
    'A-14',
    {
      id: 'shelf-a14',
      kind: 'shelf',
      code: 'A-14',
      title: 'Полка A-14',
      subtitle: 'Ряд A · Зона двигателей',
      shelf: 'A-14',
      status: 'in_stock',
    },
  ],
  [
    'B-08',
    {
      id: 'shelf-b08',
      kind: 'shelf',
      code: 'B-08',
      title: 'Полка B-08',
      subtitle: 'Ряд B · Дизель',
      shelf: 'B-08',
      status: 'in_stock',
    },
  ],
  [
    'JN1CV6EK0BM215487',
    {
      id: 'vin-ej205',
      kind: 'vin',
      code: 'JN1CV6EK0BM215487',
      title: 'VIN JN1CV6EK0BM215487',
      subtitle: 'Subaru WRX STI · EJ205',
      shelf: 'A-14',
      status: 'in_stock',
      price: 420_000,
      vin: 'JN1CV6EK0BM215487',
    },
  ],
  [
    'KMHGC41DPEU123456',
    {
      id: 'vin-om651',
      kind: 'vin',
      code: 'KMHGC41DPEU123456',
      title: 'VIN KMHGC41DPEU123456',
      subtitle: 'Mercedes E220 CDI · OM651',
      shelf: 'B-08',
      status: 'reserved',
      price: 385_000,
      vin: 'KMHGC41DPEU123456',
    },
  ],
  [
    '1842',
    {
      id: 'order-1842',
      kind: 'order',
      code: '№1842',
      title: 'Наряд №1842',
      subtitle: 'Toyota 2AD · разбор',
      shelf: 'D-04',
      status: 'ready',
      customer: 'Иван Петров',
    },
  ],
  [
    'GR-2041',
    {
      id: 'warranty-gr2041',
      kind: 'warranty',
      code: 'ГР-2041',
      title: 'Гарантия ГР-2041',
      subtitle: 'EJ205 · Алексей Смирнов',
      status: 'in_stock',
      customer: 'Алексей Смирнов',
    },
  ],
  [
    'INV-441',
    {
      id: 'invoice-441',
      kind: 'invoice',
      code: 'СФ-441',
      title: 'Счёт-фактура СФ-441',
      subtitle: 'ООО АвтоТрейд',
      price: 1_240_000,
      customer: 'ООО АвтоТрейд',
    },
  ],
  [
    'SMIRNOV',
    {
      id: 'client-smirnov',
      kind: 'customer',
      code: 'SMIRNOV',
      title: 'Алексей Смирнов',
      subtitle: '+7 701 204 18 22',
      customer: 'Алексей Смирнов',
    },
  ],
  [
    'FILTER-MANN',
    {
      id: 'part-mann',
      kind: 'part',
      code: 'W712/95',
      title: 'Фильтр Mann W712/95',
      subtitle: 'Масляный · 24 шт.',
      shelf: 'F-12',
      status: 'in_stock',
      price: 4_800,
    },
  ],
]);

export const recentScans: RecentScan[] = [
  { id: 'r1', label: 'EJ205', time: '2 мин назад', payload: 'EJ205' },
  { id: 'r2', label: 'OM651', time: '18 мин назад', payload: 'OM651' },
  { id: 'r3', label: 'A-14', time: '1 ч назад', payload: 'A-14' },
];

function normalizePayload(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^AC:/, '')
    .replace(/^VIN:/, '')
    .replace(/^SHELF:/, '')
    .replace(/^ORD:/, '')
    .replace(/^QR:/, '');
}

export function resolveScanPayload(raw: string): ScanResult | null {
  const key = normalizePayload(raw);
  return registry.get(key) ?? registry.get(key.replace(/\s/g, '')) ?? null;
}

export function isKnownPayload(raw: string): boolean {
  return resolveScanPayload(raw) !== null;
}
