import { isOpenOrderStatus } from '../lib/order-display';
import type { OrderFilterId, OrderFilterOption, OrdersListMeta, WorkOrder } from '../types';

export const orderFilters: OrderFilterOption[] = [
  { id: 'open', label: 'Active' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting parts' },
  { id: 'done', label: 'Closed' },
  { id: 'free', label: 'Free' },
  { id: 'all', label: 'All' },
];

export const mockOrders: WorkOrder[] = [
  {
    id: 'o-1842',
    number: '1842',
    customer: 'Alex Smirnov',
    phone: '+7 701 234 56 78',
    vehicle: 'BMW 320d F30',
    engine: 'N47',
    licensePlate: 'A 123 BC 02',
    vin: 'WBA3B1C50EK123456',
    assignee: 'Daniyar K.',
    price: 185_000,
    status: 'waiting_parts',
    priority: 'high',
    progress: 55,
    estimated: 'Tomorrow',
    createdAt: '09:12',
    partsNote: 'Mann filter · gasket',
    timeline: [
      { id: 't1', title: 'Created', time: '09:12', done: true },
      { id: 't2', title: 'Parts reserved', time: '10:15', done: true },
      { id: 't3', title: 'Awaiting delivery', time: '11:40', done: true },
      { id: 't4', title: 'Ready for pickup', time: '—', done: false },
    ],
  },
  {
    id: 'o-1840',
    number: '1840',
    customer: 'Marat Kasymov',
    phone: '+7 702 111 22 33',
    vehicle: 'Mercedes W212',
    engine: 'OM651',
    licensePlate: 'B 456 DE 01',
    vin: 'WDD2120021A123456',
    assignee: 'Aibek T.',
    price: 420_000,
    status: 'completed',
    priority: 'normal',
    progress: 92,
    estimated: 'Today',
    createdAt: '08:45',
    paymentNote: '50% deposit',
    timeline: [
      { id: 't1', title: 'Created', time: '08:45', done: true },
      { id: 't2', title: 'Engine pulled from stock', time: '09:30', done: true },
      { id: 't3', title: 'Ready for pickup', time: '13:10', done: true },
    ],
  },
  {
    id: 'o-1838',
    number: '1838',
    customer: 'Diesel Service',
    phone: '+7 727 300 40 50',
    vehicle: 'Audi A6 C7',
    engine: 'EA888',
    licensePlate: 'C 789 FG 15',
    assignee: 'Daniyar K.',
    price: 610_000,
    status: 'in_progress',
    priority: 'high',
    progress: 38,
    estimated: 'Friday',
    createdAt: 'Yesterday',
    timeline: [
      { id: 't1', title: 'Created', time: '16:20', done: true },
      { id: 't2', title: 'Diagnostics', time: '17:05', done: true },
      { id: 't3', title: 'Assembly', time: '—', done: false },
    ],
  },
  {
    id: 'o-1835',
    number: '1835',
    customer: 'AutoTrade LLC',
    phone: '+7 701 900 11 22',
    vehicle: 'Toyota Prado 150',
    engine: '2AD',
    licensePlate: 'D 012 HI 02',
    vin: 'JTEBU3FJ5DK123456',
    assignee: 'Aibek T.',
    price: 445_000,
    status: 'in_progress',
    priority: 'high',
    progress: 70,
    estimated: '2 days ago',
    createdAt: 'Mon',
    timeline: [
      { id: 't1', title: 'Created', time: 'Mon 10:00', done: true },
      { id: 't2', title: 'Parts received', time: 'Mon 14:30', done: true },
      { id: 't3', title: 'Awaiting customer', time: '—', done: false },
    ],
  },
  {
    id: 'o-1833',
    number: '1833',
    customer: 'Ivan Petrov',
    phone: '+7 705 555 66 77',
    vehicle: 'Subaru WRX',
    engine: 'EJ205',
    licensePlate: 'E 345 JK 09',
    price: 355_000,
    status: 'confirmed',
    priority: 'normal',
    progress: 100,
    estimated: 'Monitoring',
    createdAt: 'Wed',
    warrantyNote: 'Warranty until 08/12',
    timeline: [
      { id: 't1', title: 'Sold', time: 'Wed 11:00', done: true },
      { id: 't2', title: 'Warranty registered', time: 'Wed 11:45', done: true },
      { id: 't3', title: 'Follow-up call', time: '—', done: false },
    ],
  },
  {
    id: 'o-1830',
    number: '1830',
    customer: 'Alex Smirnov',
    phone: '+7 701 234 56 78',
    vehicle: 'VW Golf GTI',
    engine: 'EA888',
    licensePlate: 'F 678 LM 02',
    price: 520_000,
    status: 'completed',
    priority: 'normal',
    progress: 100,
    estimated: 'Yesterday',
    createdAt: 'Tue',
    timeline: [
      { id: 't1', title: 'Created', time: 'Tue 09:00', done: true },
      { id: 't2', title: 'Handed off to customer', time: 'Tue 16:30', done: true },
    ],
  },
  {
    id: 'o-1828',
    number: '1828',
    customer: 'Marat Kasymov',
    phone: '+7 702 111 22 33',
    vehicle: 'BMW F30',
    engine: 'N47',
    licensePlate: 'G 901 NO 01',
    assignee: 'Daniyar K.',
    price: 198_000,
    status: 'waiting_parts',
    priority: 'normal',
    progress: 42,
    estimated: 'Thursday',
    createdAt: 'Today',
    timeline: [
      { id: 't1', title: 'Created', time: '07:55', done: true },
      { id: 't2', title: 'Parts ordered', time: '08:20', done: true },
      { id: 't3', title: 'Awaiting delivery', time: '—', done: false },
    ],
  },
  {
    id: 'o-1825',
    number: '1825',
    customer: 'Diesel Service',
    phone: '+7 727 300 40 50',
    vehicle: 'Mercedes W212',
    engine: 'OM651',
    licensePlate: 'H 234 PQ 15',
    assignee: 'Aibek T.',
    price: 145_000,
    status: 'completed',
    priority: 'normal',
    progress: 88,
    estimated: 'Today',
    createdAt: 'Yesterday',
    timeline: [
      { id: 't1', title: 'Created', time: 'Yesterday 15:00', done: true },
      { id: 't2', title: 'Ready', time: 'Today 09:00', done: true },
    ],
  },
  {
    id: 'o-1822',
    number: '1822',
    customer: 'AutoTrade LLC',
    phone: '+7 701 900 11 22',
    vehicle: 'Audi A6',
    engine: 'EA888',
    licensePlate: 'I 567 RS 02',
    price: 580_000,
    status: 'in_progress',
    priority: 'normal',
    progress: 25,
    estimated: 'Next week',
    createdAt: 'Today',
    timeline: [
      { id: 't1', title: 'Created', time: '10:30', done: true },
      { id: 't2', title: 'Engine reserved', time: '—', done: false },
    ],
  },
  {
    id: 'o-1819',
    number: '1819',
    customer: 'Ivan Petrov',
    phone: '+7 705 555 66 77',
    vehicle: 'Toyota Prado',
    engine: '2AD',
    licensePlate: 'J 890 TU 09',
    price: 390_000,
    status: 'completed',
    priority: 'normal',
    progress: 100,
    estimated: '3 days ago',
    createdAt: 'Fri',
    timeline: [
      { id: 't1', title: 'Created', time: 'Fri 12:00', done: true },
      { id: 't2', title: 'Closed', time: 'Fri 18:00', done: true },
    ],
  },
];

export function computeOrdersListMeta(orders: WorkOrder[]): OrdersListMeta {
  return {
    total: orders.length,
    openCount: orders.filter((order) => isOpenOrderStatus(order.status)).length,
    inProgressCount: orders.filter(
      (order) => order.status === 'in_progress' || order.status === 'confirmed',
    ).length,
    waitingCount: orders.filter((order) => order.status === 'waiting_parts').length,
    closedTodayCount: orders.filter((order) => order.closedToday).length,
    freeCount: orders.filter((order) => order.isUnassigned).length,
  };
}

export function filterCounts(orders: WorkOrder[]): Record<OrderFilterId, number> {
  return {
    all: orders.length,
    open: orders.filter((order) => isOpenOrderStatus(order.status)).length,
    in_progress: orders.filter(
      (order) => order.status === 'in_progress' || order.status === 'confirmed',
    ).length,
    waiting: orders.filter((order) => order.status === 'waiting_parts').length,
    free: orders.filter((order) => order.isUnassigned).length,
    done: orders.filter((order) => !isOpenOrderStatus(order.status)).length,
  };
}

export function filterOrders(orders: WorkOrder[], filter: OrderFilterId, query: string): WorkOrder[] {
  const q = query.trim().toLowerCase();
  let list = orders;

  if (filter === 'open') {
    list = list.filter((order) => isOpenOrderStatus(order.status));
  } else if (filter === 'in_progress') {
    list = list.filter((order) => order.status === 'in_progress' || order.status === 'confirmed');
  } else if (filter === 'waiting') {
    list = list.filter((order) => order.status === 'waiting_parts');
  } else if (filter === 'done') {
    list = list.filter((order) => !isOpenOrderStatus(order.status));
  } else if (filter === 'free') {
    list = list.filter((order) => order.isUnassigned);
  }

  if (!q) return list;

  return list.filter((order) => {
    const haystack = [
      order.number,
      order.customer,
      order.phone,
      order.vehicle,
      order.engine,
      order.licensePlate,
      order.vin,
      order.assignee,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getOrderById(id: string): WorkOrder | undefined {
  return mockOrders.find((order) => order.id === id);
}
