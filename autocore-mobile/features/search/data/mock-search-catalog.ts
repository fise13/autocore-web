import type {
  QuickCategory,
  SearchEngine,
  SearchFilterId,
  SearchFilterOption,
  SearchResultGroup,
  SearchResultItem,
  SearchResultKind,
} from '../types';

export const searchFilters: SearchFilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'engines', label: 'Engines' },
  { id: 'gearboxes', label: 'Transmissions' },
  { id: 'parts', label: 'Parts' },
  { id: 'documents', label: 'Documents' },
  { id: 'clients', label: 'Clients' },
  { id: 'sales', label: 'Sales' },
  { id: 'orders', label: 'Orders' },
  { id: 'accounting', label: 'Accounting' },
];

export const recentQueries = ['EJ205', 'OM651', 'EA888', '4G63'] as const;

export const quickCategories: QuickCategory[] = [
  { id: 'engines', label: 'Engines' },
  { id: 'gearboxes', label: 'Transmissions' },
  { id: 'parts', label: 'Parts' },
  { id: 'documents', label: 'Documents' },
  { id: 'sales', label: 'Sales' },
];

export const searchEngines: SearchEngine[] = [
  {
    id: 'eng-ej205',
    code: 'EJ205',
    vehicle: 'Subaru Impreza WRX',
    status: 'in_stock',
    shelf: 'A-14',
    price: 420_000,
    vin: 'JN1CV6EK0BM215487',
  },
  {
    id: 'eng-ej207',
    code: 'EJ207',
    vehicle: 'Subaru Legacy B4',
    status: 'reserved',
    shelf: 'A-16',
    price: 465_000,
    vin: 'JF1BL5LS5AG012345',
  },
  {
    id: 'eng-ej20x',
    code: 'EJ20X',
    vehicle: 'Subaru Forester XT',
    status: 'in_stock',
    shelf: 'A-18',
    price: 398_000,
  },
  {
    id: 'eng-ea888',
    code: 'EA888',
    vehicle: 'VW Golf GTI',
    status: 'sold',
    shelf: 'B-07',
    price: 610_000,
    vin: 'WVWZZZ1KZAW123456',
  },
  {
    id: 'eng-om651',
    code: 'OM651',
    vehicle: 'Mercedes E220 CDI',
    status: 'in_stock',
    shelf: 'B-11',
    price: 385_000,
    vin: 'WDD2120021A123456',
  },
  {
    id: 'eng-n47',
    code: 'N47',
    vehicle: 'BMW 320d F30',
    status: 'deficit',
    shelf: 'C-21',
    price: 520_000,
    vin: 'WBA3B1C50EK123456',
  },
  {
    id: 'eng-2gr',
    code: '2GR',
    vehicle: 'Toyota Camry 3.5',
    status: 'ready',
    shelf: 'C-04',
    price: 445_000,
  },
  {
    id: 'eng-1kd',
    code: '1KD',
    vehicle: 'Toyota Land Cruiser 200',
    status: 'pending_delivery',
    shelf: 'D-04',
    price: 890_000,
    vin: 'JTMHX05J504123456',
  },
  {
    id: 'eng-4g63',
    code: '4G63',
    vehicle: 'Mitsubishi Lancer Evo',
    status: 'in_stock',
    shelf: 'A-22',
    price: 355_000,
  },
  {
    id: 'eng-j35',
    code: 'J35',
    vehicle: 'Honda Pilot',
    status: 'reserved',
    shelf: 'B-19',
    price: 410_000,
    vin: '5FNYF4H70BB123456',
  },
];

export const recentlyViewedEngines = searchEngines.filter((engine) =>
  ['eng-ej205', 'eng-om651', 'eng-ea888', 'eng-n47'].includes(engine.id),
);

type CatalogEntry = SearchResultItem & { haystack: string; filter: SearchFilterId | 'vehicles' };

const catalog: CatalogEntry[] = [
  ...searchEngines.map((engine) => ({
    id: engine.id,
    kind: 'engine' as const,
    title: engine.code,
    subtitle: engine.vehicle,
    status: engine.status,
    shelf: engine.shelf,
    price: engine.price,
    vin: engine.vin,
    filter: 'engines' as const,
    haystack: [engine.code, engine.vehicle, engine.shelf, engine.vin].filter(Boolean).join(' ').toLowerCase(),
  })),
  ...[
    { id: 'gb-dq250', title: 'DQ250', subtitle: 'VW DSG 6-speed', shelf: 'E-02', price: 185_000, status: 'in_stock' as const },
    { id: 'gb-dq381', title: 'DQ381', subtitle: 'VW DSG 7-speed', shelf: 'E-05', price: 220_000, status: 'reserved' as const },
    { id: 'gb-zf8hp', title: 'ZF8HP', subtitle: 'BMW 8-speed', shelf: 'E-08', price: 310_000, status: 'in_stock' as const },
    { id: 'gb-re5r05a', title: 'RE5R05A', subtitle: 'Nissan Patrol', shelf: 'E-11', price: 145_000, status: 'sold' as const },
  ].map((item) => ({
    ...item,
    kind: 'gearbox' as const,
    filter: 'gearboxes' as const,
    haystack: `${item.title} ${item.subtitle} ${item.shelf}`.toLowerCase(),
  })),
  ...[
    { id: 'part-turbo-ej205', title: 'EJ205 turbo', subtitle: 'VF34', shelf: 'F-03' },
    { id: 'part-filter-mann', title: 'Mann W712/95 filter', subtitle: 'Oil filter', shelf: 'F-12' },
    { id: 'part-injector-om651', title: 'OM651 injector', subtitle: 'Bosch', shelf: 'F-18' },
  ].map((item) => ({
    ...item,
    kind: 'part' as const,
    filter: 'parts' as const,
    haystack: `${item.title} ${item.subtitle} ${item.shelf}`.toLowerCase(),
  })),
  ...[
    { id: 'doc-warranty-ej205', title: 'EJ205 warranty', subtitle: 'No. WR-2041' },
    { id: 'doc-act-om651', title: 'OM651 receiving report', subtitle: 'Warehouse A' },
    { id: 'doc-invoice-1842', title: 'Invoice #1842', subtitle: 'AutoTrade LLC' },
  ].map((item) => ({
    ...item,
    kind: 'document' as const,
    filter: 'documents' as const,
    haystack: `${item.title} ${item.subtitle}`.toLowerCase(),
  })),
  ...[
    { id: 'client-smirnov', title: 'Alex Smirnov', subtitle: '+1 701 204 1822' },
    { id: 'client-petrov', title: 'Ivan Petrov', subtitle: 'Petrov Sole Proprietorship' },
    { id: 'client-kasymov', title: 'Marat Kasymov', subtitle: 'Diesel Service' },
    { id: 'client-autotrade', title: 'AutoTrade LLC', subtitle: 'Wholesale client' },
    { id: 'client-diesel', title: 'Diesel Service', subtitle: 'Repair shop' },
  ].map((item) => ({
    ...item,
    kind: 'client' as const,
    filter: 'clients' as const,
    haystack: `${item.title} ${item.subtitle}`.toLowerCase(),
  })),
  ...[
    { id: 'sale-185', title: 'Sale $185,000', subtitle: '4G63 · Ivan Petrov' },
    { id: 'sale-420', title: 'Sale $420,000', subtitle: 'EJ205 · Alex Smirnov' },
    { id: 'sale-610', title: 'Sale $610,000', subtitle: 'EA888 · AutoTrade LLC' },
  ].map((item) => ({
    ...item,
    kind: 'sale' as const,
    filter: 'sales' as const,
    haystack: `${item.title} ${item.subtitle}`.toLowerCase(),
  })),
  ...[
    { id: 'order-1842', title: '#1842', subtitle: 'Toyota 2AD teardown' },
    { id: 'order-1836', title: '#1836', subtitle: 'EJ207 reservation' },
    { id: 'order-1829', title: '#1829', subtitle: 'OM651 delivery' },
  ].map((item) => ({
    ...item,
    kind: 'order' as const,
    filter: 'orders' as const,
    haystack: `${item.title} ${item.subtitle}`.toLowerCase(),
  })),
  ...[
    { id: 'veh-wrx', title: 'Subaru Impreza WRX', subtitle: 'EJ205 · 2011', haystack: 'subaru impreza wrx ej205 ej20 ej2 2011' },
    { id: 'veh-legacy', title: 'Subaru Legacy B4', subtitle: 'EJ207 · 2008', haystack: 'subaru legacy b4 ej207 ej20 ej2 2008' },
    { id: 'veh-golf', title: 'VW Golf GTI', subtitle: 'EA888 · 2015', haystack: 'vw golf gti ea888 ea88 2015' },
  ].map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    kind: 'vehicle' as const,
    filter: 'vehicles' as const,
    haystack: item.haystack,
  })),
  ...[
    { id: 'acc-invoice-441', title: 'Invoice #441', subtitle: 'Accounting · March' },
    { id: 'acc-payment-228', title: 'Payment #228', subtitle: 'AutoTrade LLC' },
  ].map((item) => ({
    ...item,
    kind: 'accounting' as const,
    filter: 'accounting' as const,
    haystack: `${item.title} ${item.subtitle}`.toLowerCase(),
  })),
];

const groupTitles: Record<SearchFilterId | 'vehicles', string> = {
  all: 'All',
  engines: 'Engines',
  gearboxes: 'Transmissions',
  motors: 'Motors',
  parts: 'Parts',
  documents: 'Documents',
  clients: 'Clients',
  sales: 'Sales',
  orders: 'Orders',
  accounting: 'Accounting',
  vehicles: 'Vehicles',
};

const groupOrder: Array<SearchFilterId | 'vehicles'> = [
  'engines',
  'vehicles',
  'gearboxes',
  'parts',
  'clients',
  'documents',
  'orders',
  'sales',
  'accounting',
];

function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return haystack.includes(q);
}

function matchesFilter(entry: CatalogEntry, filter: SearchFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'engines') return entry.filter === 'engines';
  return entry.filter === filter;
}

function toResultItem(entry: CatalogEntry): SearchResultItem {
  const { haystack: _haystack, filter: _filter, ...item } = entry;
  return item;
}

export function searchCatalog(query: string, filter: SearchFilterId): SearchResultGroup[] {
  const q = query.trim();
  if (!q) return [];

  const matched = catalog.filter(
    (entry) => matchesQuery(entry.haystack, q) && matchesFilter(entry, filter),
  );

  if (filter !== 'all') {
    if (matched.length === 0) return [];
    return [
      {
        id: filter,
        title: groupTitles[filter],
        filter,
        items: matched.map(toResultItem),
      },
    ];
  }

  const grouped = new Map<SearchFilterId | 'vehicles', SearchResultItem[]>();

  for (const entry of matched) {
    const bucket = grouped.get(entry.filter) ?? [];
    bucket.push(toResultItem(entry));
    grouped.set(entry.filter, bucket);
  }

  return groupOrder
    .filter((key) => grouped.has(key))
    .map((key) => ({
      id: key,
      title: groupTitles[key],
      filter: key,
      items: grouped.get(key) ?? [],
    }));
}

export function engineById(id: string): SearchEngine | undefined {
  return searchEngines.find((engine) => engine.id === id);
}

export function kindToFilter(kind: SearchResultKind): SearchFilterId | 'vehicles' {
  if (kind === 'vehicle') return 'vehicles';
  if (kind === 'engine') return 'engines';
  if (kind === 'gearbox') return 'gearboxes';
  if (kind === 'part') return 'parts';
  if (kind === 'document') return 'documents';
  if (kind === 'client') return 'clients';
  if (kind === 'sale') return 'sales';
  if (kind === 'order') return 'orders';
  return 'accounting';
}
