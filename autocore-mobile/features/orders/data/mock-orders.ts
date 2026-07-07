import { isOpenOrderStatus } from '../lib/order-display';
import type { OrderFilterId, OrderFilterOption, OrdersListMeta, WorkOrder } from '../types';

export const orderFilters: OrderFilterOption[] = [
  { id: 'all', label: 'Все' },
  { id: 'open', label: 'Открытые' },
  { id: 'free', label: 'Свободные' },
  { id: 'done', label: 'Закрытые' },
];

export const mockOrders: WorkOrder[] = [
  {
    id: 'o-1842',
    number: '1842',
    customer: 'Алексей Смирнов',
    phone: '+7 701 234 56 78',
    vehicle: 'BMW 320d F30',
    engine: 'N47',
    licensePlate: 'A 123 BC 02',
    vin: 'WBA3B1C50EK123456',
    assignee: 'Данияр К.',
    price: 185_000,
    status: 'waiting_parts',
    priority: 'high',
    progress: 55,
    estimated: 'Завтра',
    createdAt: '09:12',
    partsNote: 'Фильтр Mann · прокладка',
    timeline: [
      { id: 't1', title: 'Создан', time: '09:12', done: true },
      { id: 't2', title: 'Запчасти зарезервированы', time: '10:15', done: true },
      { id: 't3', title: 'Ожидание поставки', time: '11:40', done: true },
      { id: 't4', title: 'Готов к выдаче', time: '—', done: false },
    ],
  },
  {
    id: 'o-1840',
    number: '1840',
    customer: 'Марат Касымов',
    phone: '+7 702 111 22 33',
    vehicle: 'Mercedes W212',
    engine: 'OM651',
    licensePlate: 'B 456 DE 01',
    vin: 'WDD2120021A123456',
    assignee: 'Айбек Т.',
    price: 420_000,
    status: 'ready',
    priority: 'normal',
    progress: 92,
    estimated: 'Сегодня',
    createdAt: '08:45',
    paymentNote: 'Предоплата 50%',
    timeline: [
      { id: 't1', title: 'Создан', time: '08:45', done: true },
      { id: 't2', title: 'Двигатель снят со склада', time: '09:30', done: true },
      { id: 't3', title: 'Готов к выдаче', time: '13:10', done: true },
    ],
  },
  {
    id: 'o-1838',
    number: '1838',
    customer: 'Дизель Сервис',
    phone: '+7 727 300 40 50',
    vehicle: 'Audi A6 C7',
    engine: 'EA888',
    licensePlate: 'C 789 FG 15',
    assignee: 'Данияр К.',
    price: 610_000,
    status: 'in_progress',
    priority: 'high',
    progress: 38,
    estimated: 'Пятница',
    createdAt: 'Вчера',
    timeline: [
      { id: 't1', title: 'Создан', time: '16:20', done: true },
      { id: 't2', title: 'Диагностика', time: '17:05', done: true },
      { id: 't3', title: 'Сборка', time: '—', done: false },
    ],
  },
  {
    id: 'o-1835',
    number: '1835',
    customer: 'ООО АвтоТрейд',
    phone: '+7 701 900 11 22',
    vehicle: 'Toyota Prado 150',
    engine: '2AD',
    licensePlate: 'D 012 HI 02',
    vin: 'JTEBU3FJ5DK123456',
    assignee: 'Айбек Т.',
    price: 445_000,
    status: 'overdue',
    priority: 'high',
    progress: 70,
    estimated: '2 дня назад',
    createdAt: 'Пн',
    timeline: [
      { id: 't1', title: 'Создан', time: 'Пн 10:00', done: true },
      { id: 't2', title: 'Запчасти получены', time: 'Пн 14:30', done: true },
      { id: 't3', title: 'Ожидает клиента', time: '—', done: false },
    ],
  },
  {
    id: 'o-1833',
    number: '1833',
    customer: 'Иван Петров',
    phone: '+7 705 555 66 77',
    vehicle: 'Subaru WRX',
    engine: 'EJ205',
    licensePlate: 'E 345 JK 09',
    price: 355_000,
    status: 'warranty',
    priority: 'normal',
    progress: 100,
    estimated: 'На контроле',
    createdAt: 'Ср',
    warrantyNote: 'Гарантия до 12.08',
    timeline: [
      { id: 't1', title: 'Продажа', time: 'Ср 11:00', done: true },
      { id: 't2', title: 'Гарантия оформлена', time: 'Ср 11:45', done: true },
      { id: 't3', title: 'Контрольный звонок', time: '—', done: false },
    ],
  },
  {
    id: 'o-1830',
    number: '1830',
    customer: 'Алексей Смирнов',
    phone: '+7 701 234 56 78',
    vehicle: 'VW Golf GTI',
    engine: 'EA888',
    licensePlate: 'F 678 LM 02',
    price: 520_000,
    status: 'completed',
    priority: 'normal',
    progress: 100,
    estimated: 'Вчера',
    createdAt: 'Вт',
    timeline: [
      { id: 't1', title: 'Создан', time: 'Вт 09:00', done: true },
      { id: 't2', title: 'Выдан клиенту', time: 'Вт 16:30', done: true },
    ],
  },
  {
    id: 'o-1828',
    number: '1828',
    customer: 'Марат Касымов',
    phone: '+7 702 111 22 33',
    vehicle: 'BMW F30',
    engine: 'N47',
    licensePlate: 'G 901 NO 01',
    assignee: 'Данияр К.',
    price: 198_000,
    status: 'waiting_parts',
    priority: 'normal',
    progress: 42,
    estimated: 'Четверг',
    createdAt: 'Сегодня',
    timeline: [
      { id: 't1', title: 'Создан', time: '07:55', done: true },
      { id: 't2', title: 'Заказ запчастей', time: '08:20', done: true },
      { id: 't3', title: 'Ожидание поставки', time: '—', done: false },
    ],
  },
  {
    id: 'o-1825',
    number: '1825',
    customer: 'Дизель Сервис',
    phone: '+7 727 300 40 50',
    vehicle: 'Mercedes W212',
    engine: 'OM651',
    licensePlate: 'H 234 PQ 15',
    assignee: 'Айбек Т.',
    price: 145_000,
    status: 'ready',
    priority: 'normal',
    progress: 88,
    estimated: 'Сегодня',
    createdAt: 'Вчера',
    timeline: [
      { id: 't1', title: 'Создан', time: 'Вчера 15:00', done: true },
      { id: 't2', title: 'Готов', time: 'Сегодня 09:00', done: true },
    ],
  },
  {
    id: 'o-1822',
    number: '1822',
    customer: 'ООО АвтоТрейд',
    phone: '+7 701 900 11 22',
    vehicle: 'Audi A6',
    engine: 'EA888',
    licensePlate: 'I 567 RS 02',
    price: 580_000,
    status: 'in_progress',
    priority: 'normal',
    progress: 25,
    estimated: 'След. неделя',
    createdAt: 'Сегодня',
    timeline: [
      { id: 't1', title: 'Создан', time: '10:30', done: true },
      { id: 't2', title: 'Резерв двигателя', time: '—', done: false },
    ],
  },
  {
    id: 'o-1819',
    number: '1819',
    customer: 'Иван Петров',
    phone: '+7 705 555 66 77',
    vehicle: 'Toyota Prado',
    engine: '2AD',
    licensePlate: 'J 890 TU 09',
    price: 390_000,
    status: 'completed',
    priority: 'normal',
    progress: 100,
    estimated: '3 дня назад',
    createdAt: 'Пт',
    timeline: [
      { id: 't1', title: 'Создан', time: 'Пт 12:00', done: true },
      { id: 't2', title: 'Закрыт', time: 'Пт 18:00', done: true },
    ],
  },
];

export function computeOrdersListMeta(orders: WorkOrder[]): OrdersListMeta {
  return {
    total: orders.length,
    openCount: orders.filter((order) => isOpenOrderStatus(order.status)).length,
  };
}

export function filterCounts(orders: WorkOrder[]): Record<OrderFilterId, number> {
  return {
    all: orders.length,
    open: orders.filter((order) => isOpenOrderStatus(order.status)).length,
    free: orders.filter((order) => order.isUnassigned).length,
    done: orders.filter((order) => !isOpenOrderStatus(order.status)).length,
  };
}

export function filterOrders(orders: WorkOrder[], filter: OrderFilterId, query: string): WorkOrder[] {
  const q = query.trim().toLowerCase();
  let list = orders;

  if (filter === 'open') {
    list = list.filter((order) => isOpenOrderStatus(order.status));
  } else if (filter === 'done') {
    list = list.filter((order) => !isOpenOrderStatus(order.status));
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
