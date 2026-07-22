import type { MotorEntity } from "@/domain/motor";

/**
 * Canonical demo-company snapshot for marketing product surfaces.
 * Sources: demo-seed.server.ts + demo-document-context.ts
 */

export const landingDemoCompany = {
  name: "AutoCore Service",
  legalName: 'ТОО "AutoCore Demo"',
  address: "г. Алматы, ул. Райымбек 142",
} as const;

/** From demo-document-context / document fixtures — primary narrative motor. */
export const landingDemoMotor = {
  id: "motor-001",
  brandName: "Hyundai",
  engineCode: "G4KC",
  configuration: "2.4 MPI",
  serialCode: "G4KC-88421",
  transmission: "AT",
  quantity: 1,
  location: "A-12",
  status: "reserved" as const,
  notes: "184 000 км · контрактный",
  reservedFor: "НЗ-2026-0142",
  lastAction: "Сегодня, 09:14",
} as const;

/** Real MotorEntity for interactive sell demo (available on shelf). */
export const landingDemoMotorEntity: MotorEntity = {
  id: "motor-001",
  companyId: "demo-company",
  brandName: "Hyundai",
  engineCode: "G4KC",
  configuration: "2.4 MPI",
  serialCode: "G4KC-88421",
  transmission: "AT",
  quantity: 1,
  notes: "184 000 км · контрактный",
  arrivalDate: new Date("2026-02-01"),
  soldDate: null,
  primaryLocationCode: "A-12",
  warehouseLocation: "A-12",
  status: "available",
  reservedForWorkOrderId: null,
  createdAt: new Date("2026-02-01"),
  updatedAt: new Date("2026-02-01"),
};

export const landingDemoMotorSalePrice = 380_000;

export const landingDemoSaleClient = {
  fullName: "Алексей Ким",
  phone: "+7 701 234 56 78",
} as const;

/** Sale demo grid — several available motors, Excel-style. */
export const landingDemoMotorsSale = [
  {
    id: "motor-001",
    brandName: "Hyundai",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-88421",
    transmission: "AT",
    quantity: 1,
    location: "A-12",
    status: "available" as const,
    price: 380_000,
    notes: "184 000 км · контрактный",
  },
  {
    id: "motor-2az",
    brandName: "Toyota",
    engineCode: "2AZ-FE",
    configuration: "2.4",
    serialCode: "2AZ-44102",
    transmission: "AT",
    quantity: 1,
    location: "B-04",
    status: "available" as const,
    price: 420_000,
    notes: "162 000 км",
  },
  {
    id: "motor-g4kd",
    brandName: "Kia",
    engineCode: "G4KD",
    configuration: "2.0",
    serialCode: "G4KD-22901",
    transmission: "MT",
    quantity: 1,
    location: "A-18",
    status: "available" as const,
    price: 295_000,
    notes: "198 000 км",
  },
  {
    id: "motor-qr25",
    brandName: "Nissan",
    engineCode: "QR25DE",
    configuration: "2.5",
    serialCode: "QR25-77410",
    transmission: "AT",
    quantity: 1,
    location: "C-07",
    status: "available" as const,
    price: 355_000,
    notes: "141 000 км",
  },
  {
    id: "motor-cjsa",
    brandName: "Volkswagen",
    engineCode: "CJSA",
    configuration: "1.8 TSI",
    serialCode: "CJSA-90331",
    transmission: "DSG",
    quantity: 1,
    location: "B-11",
    status: "available" as const,
    price: 510_000,
    notes: "128 000 км",
  },
] as const;

export type LandingSaleMotor = (typeof landingDemoMotorsSale)[number];

export function toLandingSaleMotorEntity(motor: LandingSaleMotor): MotorEntity {
  return {
    id: motor.id,
    companyId: "demo-company",
    brandName: motor.brandName,
    engineCode: motor.engineCode,
    configuration: motor.configuration,
    serialCode: motor.serialCode,
    transmission: motor.transmission,
    quantity: motor.quantity,
    notes: motor.notes,
    arrivalDate: new Date("2026-02-01"),
    soldDate: null,
    primaryLocationCode: motor.location,
    warehouseLocation: motor.location,
    status: "available",
    reservedForWorkOrderId: null,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
  };
}

/**
 * Ideal hero dataset: `/motors?collection=engines` filtered by search `G4KC`.
 * Primary row matches demo-document-context; siblings fill a working yard grid.
 */
export const landingDemoMotorsHero = [
  landingDemoMotor,
  {
    id: "motor-g4kc-02",
    brandName: "Hyundai",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-77104",
    transmission: "AT",
    quantity: 1,
    location: "A-12",
    status: "available" as const,
    notes: "162 000 км",
    reservedFor: null,
    lastAction: "Сегодня, 08:41",
  },
  {
    id: "motor-g4kc-03",
    brandName: "Hyundai",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-55219",
    transmission: "MT",
    quantity: 1,
    location: "A-14",
    status: "available" as const,
    notes: "198 000 км",
    reservedFor: null,
    lastAction: "Вчера, 17:22",
  },
  {
    id: "motor-g4kc-04",
    brandName: "Kia",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-33088",
    transmission: "AT",
    quantity: 1,
    location: "B-02",
    status: "available" as const,
    notes: "141 000 км",
    reservedFor: null,
    lastAction: "Вчера, 14:05",
  },
  {
    id: "motor-g4kc-05",
    brandName: "Hyundai",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-11967",
    transmission: "AT",
    quantity: 1,
    location: "B-05",
    status: "available" as const,
    notes: "210 000 км · на разбор",
    reservedFor: null,
    lastAction: "Пн, 11:38",
  },
  {
    id: "motor-g4kc-06",
    brandName: "Hyundai",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-90812",
    transmission: "MT",
    quantity: 1,
    location: "C-01",
    status: "available" as const,
    notes: "175 000 км",
    reservedFor: null,
    lastAction: "Пн, 10:02",
  },
] as const;

/**
 * Dense motors yard for outcome atmosphere background —
 * full working database presence, not a demo sample.
 */
export const landingDemoMotorsAtmosphere = [
  { brandName: "Subaru", engineCode: "EJ205", configuration: "2.0 Turbo", serialCode: "EJ205-44102", transmission: "MT", quantity: 1, location: "A-01", status: "available" as const, notes: "142 000 км", reservedFor: null as string | null, lastAction: "Сегодня, 07:12" },
  { brandName: "Subaru", engineCode: "EJ207", configuration: "2.0 Spec-C", serialCode: "EJ207-88211", transmission: "MT", quantity: 1, location: "A-02", status: "available" as const, notes: "98 000 км", reservedFor: null, lastAction: "Сегодня, 07:18" },
  { brandName: "Subaru", engineCode: "EJ253", configuration: "2.5 SOHC", serialCode: "EJ253-33019", transmission: "AT", quantity: 1, location: "A-03", status: "reserved" as const, notes: "176 000 км", reservedFor: "НЗ-2026-0155", lastAction: "Сегодня, 08:02" },
  { brandName: "Hyundai", engineCode: "G4KC", configuration: "2.4 MPI", serialCode: "G4KC-88421", transmission: "AT", quantity: 1, location: "A-12", status: "reserved" as const, notes: "184 000 км", reservedFor: "НЗ-2026-0142", lastAction: "Сегодня, 09:14" },
  { brandName: "Hyundai", engineCode: "G4KC", configuration: "2.4 MPI", serialCode: "G4KC-77104", transmission: "AT", quantity: 1, location: "A-12", status: "available" as const, notes: "162 000 км", reservedFor: null, lastAction: "Сегодня, 08:41" },
  { brandName: "Toyota", engineCode: "2AZ-FE", configuration: "2.4", serialCode: "2AZ-44102", transmission: "AT", quantity: 1, location: "B-04", status: "available" as const, notes: "162 000 км", reservedFor: null, lastAction: "Сегодня, 08:55" },
  { brandName: "Toyota", engineCode: "1ZZ-FE", configuration: "1.8", serialCode: "1ZZ-22081", transmission: "MT", quantity: 1, location: "B-05", status: "available" as const, notes: "201 000 км", reservedFor: null, lastAction: "Вчера, 16:40" },
  { brandName: "Honda", engineCode: "K24A", configuration: "2.4", serialCode: "K24A-90144", transmission: "MT", quantity: 1, location: "B-08", status: "available" as const, notes: "128 000 км", reservedFor: null, lastAction: "Сегодня, 09:01" },
  { brandName: "Honda", engineCode: "R18A", configuration: "1.8", serialCode: "R18A-55102", transmission: "AT", quantity: 1, location: "B-09", status: "available" as const, notes: "155 000 км", reservedFor: null, lastAction: "Вчера, 14:22" },
  { brandName: "Mercedes", engineCode: "M111", configuration: "2.3 Kompressor", serialCode: "M111-77401", transmission: "AT", quantity: 1, location: "C-02", status: "available" as const, notes: "211 000 км", reservedFor: null, lastAction: "Вчера, 12:08" },
  { brandName: "Mercedes", engineCode: "M271", configuration: "1.8 CGI", serialCode: "M271-33088", transmission: "AT", quantity: 1, location: "C-03", status: "reserved" as const, notes: "167 000 км", reservedFor: "НЗ-2026-0158", lastAction: "Сегодня, 10:11" },
  { brandName: "BMW", engineCode: "N52", configuration: "3.0", serialCode: "N52-11967", transmission: "AT", quantity: 1, location: "C-06", status: "available" as const, notes: "189 000 км", reservedFor: null, lastAction: "Пн, 11:38" },
  { brandName: "BMW", engineCode: "N46", configuration: "2.0", serialCode: "N46-55219", transmission: "MT", quantity: 1, location: "C-07", status: "available" as const, notes: "203 000 км", reservedFor: null, lastAction: "Пн, 10:02" },
  { brandName: "Kia", engineCode: "G4KD", configuration: "2.0", serialCode: "G4KD-22901", transmission: "MT", quantity: 1, location: "A-18", status: "available" as const, notes: "198 000 км", reservedFor: null, lastAction: "Вчера, 17:22" },
  { brandName: "Nissan", engineCode: "QR25DE", configuration: "2.5", serialCode: "QR25-77410", transmission: "AT", quantity: 1, location: "C-11", status: "available" as const, notes: "141 000 км", reservedFor: null, lastAction: "Вчера, 15:40" },
  { brandName: "Nissan", engineCode: "VQ35DE", configuration: "3.5", serialCode: "VQ35-90812", transmission: "AT", quantity: 1, location: "C-12", status: "available" as const, notes: "176 000 км", reservedFor: null, lastAction: "Пн, 09:44" },
  { brandName: "Volkswagen", engineCode: "CJSA", configuration: "1.8 TSI", serialCode: "CJSA-90331", transmission: "DSG", quantity: 1, location: "B-11", status: "available" as const, notes: "128 000 км", reservedFor: null, lastAction: "Сегодня, 09:33" },
  { brandName: "Volkswagen", engineCode: "CAXA", configuration: "1.4 TSI", serialCode: "CAXA-44190", transmission: "DSG", quantity: 1, location: "B-12", status: "available" as const, notes: "152 000 км", reservedFor: null, lastAction: "Вчера, 11:05" },
  { brandName: "Audi", engineCode: "CAEB", configuration: "2.0 TFSI", serialCode: "CAEB-22014", transmission: "DSG", quantity: 1, location: "D-01", status: "reserved" as const, notes: "134 000 км", reservedFor: "НЗ-2026-0161", lastAction: "Сегодня, 10:40" },
  { brandName: "Mazda", engineCode: "LF17", configuration: "2.0", serialCode: "LF17-66102", transmission: "AT", quantity: 1, location: "D-04", status: "available" as const, notes: "188 000 км", reservedFor: null, lastAction: "Пн, 13:20" },
  { brandName: "Mazda", engineCode: "L3-VE", configuration: "2.3", serialCode: "L3VE-77155", transmission: "MT", quantity: 1, location: "D-05", status: "available" as const, notes: "214 000 км", reservedFor: null, lastAction: "Пн, 12:01" },
  { brandName: "Mitsubishi", engineCode: "4G63", configuration: "2.0 Turbo", serialCode: "4G63-33001", transmission: "MT", quantity: 1, location: "D-08", status: "available" as const, notes: "119 000 км", reservedFor: null, lastAction: "Сегодня, 07:50" },
  { brandName: "Mitsubishi", engineCode: "6G72", configuration: "3.0", serialCode: "6G72-88044", transmission: "AT", quantity: 1, location: "D-09", status: "available" as const, notes: "231 000 км", reservedFor: null, lastAction: "Вчера, 18:12" },
  { brandName: "Ford", engineCode: "Duratec", configuration: "2.3", serialCode: "DUR-55280", transmission: "AT", quantity: 1, location: "E-02", status: "available" as const, notes: "171 000 км", reservedFor: null, lastAction: "Вчера, 13:55" },
  { brandName: "Opel", engineCode: "Z18XER", configuration: "1.8", serialCode: "Z18-44177", transmission: "MT", quantity: 1, location: "E-05", status: "available" as const, notes: "193 000 км", reservedFor: null, lastAction: "Пн, 15:08" },
  { brandName: "Peugeot", engineCode: "EW10A", configuration: "2.0", serialCode: "EW10-22990", transmission: "AT", quantity: 1, location: "E-07", status: "reserved" as const, notes: "207 000 км", reservedFor: "НЗ-2026-0164", lastAction: "Сегодня, 11:02" },
  { brandName: "Lexus", engineCode: "2GR-FE", configuration: "3.5", serialCode: "2GR-11880", transmission: "AT", quantity: 1, location: "F-01", status: "available" as const, notes: "145 000 км", reservedFor: null, lastAction: "Сегодня, 08:20" },
  { brandName: "Infiniti", engineCode: "VQ37VHR", configuration: "3.7", serialCode: "VQ37-66712", transmission: "AT", quantity: 1, location: "F-03", status: "available" as const, notes: "132 000 км", reservedFor: null, lastAction: "Вчера, 10:30" },
  { brandName: "Subaru", engineCode: "EJ205", configuration: "2.0 Turbo", serialCode: "EJ205-55290", transmission: "MT", quantity: 1, location: "A-04", status: "available" as const, notes: "156 000 км", reservedFor: null, lastAction: "Пн, 08:14" },
  { brandName: "Subaru", engineCode: "EJ207", configuration: "2.0 Spec-C", serialCode: "EJ207-10044", transmission: "MT", quantity: 1, location: "A-05", status: "available" as const, notes: "87 000 км", reservedFor: null, lastAction: "Пн, 09:02" },
  { brandName: "Hyundai", engineCode: "G4KC", configuration: "2.4 MPI", serialCode: "G4KC-55219", transmission: "MT", quantity: 1, location: "A-14", status: "available" as const, notes: "201 000 км", reservedFor: null, lastAction: "Вчера, 16:05" },
  { brandName: "Hyundai", engineCode: "G4KC", configuration: "2.4 MPI", serialCode: "G4KC-33088", transmission: "AT", quantity: 1, location: "A-15", status: "available" as const, notes: "171 000 км", reservedFor: null, lastAction: "Вчера, 12:48" },
  { brandName: "Toyota", engineCode: "2AZ-FE", configuration: "2.4", serialCode: "2AZ-90812", transmission: "AT", quantity: 1, location: "B-06", status: "reserved" as const, notes: "148 000 км", reservedFor: "НЗ-2026-0168", lastAction: "Сегодня, 11:20" },
  { brandName: "Honda", engineCode: "K24A", configuration: "2.4", serialCode: "K24A-22081", transmission: "AT", quantity: 1, location: "B-10", status: "available" as const, notes: "139 000 км", reservedFor: null, lastAction: "Вчера, 09:33" },
  { brandName: "BMW", engineCode: "N52", configuration: "3.0", serialCode: "N52-44102", transmission: "MT", quantity: 1, location: "C-08", status: "available" as const, notes: "167 000 км", reservedFor: null, lastAction: "Пн, 14:55" },
  { brandName: "Mercedes", engineCode: "M111", configuration: "2.3 Kompressor", serialCode: "M111-11967", transmission: "MT", quantity: 1, location: "C-04", status: "available" as const, notes: "224 000 км", reservedFor: null, lastAction: "Пн, 11:10" },
  { brandName: "Nissan", engineCode: "QR25DE", configuration: "2.5", serialCode: "QR25-33019", transmission: "MT", quantity: 1, location: "C-13", status: "available" as const, notes: "159 000 км", reservedFor: null, lastAction: "Сегодня, 07:44" },
  { brandName: "Volkswagen", engineCode: "CJSA", configuration: "1.8 TSI", serialCode: "CJSA-66102", transmission: "MT", quantity: 1, location: "B-13", status: "available" as const, notes: "141 000 км", reservedFor: null, lastAction: "Вчера, 17:01" },
  { brandName: "Audi", engineCode: "CAEB", configuration: "2.0 TFSI", serialCode: "CAEB-77155", transmission: "AT", quantity: 1, location: "D-02", status: "available" as const, notes: "122 000 км", reservedFor: null, lastAction: "Пн, 10:28" },
  { brandName: "Mitsubishi", engineCode: "4G63", configuration: "2.0 Turbo", serialCode: "4G63-55280", transmission: "MT", quantity: 1, location: "D-10", status: "reserved" as const, notes: "105 000 км", reservedFor: "НЗ-2026-0170", lastAction: "Сегодня, 10:55" },
  { brandName: "Mazda", engineCode: "LF17", configuration: "2.0", serialCode: "LF17-22990", transmission: "MT", quantity: 1, location: "D-06", status: "available" as const, notes: "196 000 км", reservedFor: null, lastAction: "Вчера, 15:17" },
  { brandName: "Ford", engineCode: "Duratec", configuration: "2.3", serialCode: "DUR-11880", transmission: "MT", quantity: 1, location: "E-03", status: "available" as const, notes: "183 000 км", reservedFor: null, lastAction: "Пн, 16:40" },
  { brandName: "Lexus", engineCode: "2GR-FE", configuration: "3.5", serialCode: "2GR-66712", transmission: "AT", quantity: 1, location: "F-02", status: "available" as const, notes: "138 000 км", reservedFor: null, lastAction: "Сегодня, 09:48" },
  { brandName: "Kia", engineCode: "G4KD", configuration: "2.0", serialCode: "G4KD-44177", transmission: "AT", quantity: 1, location: "A-19", status: "available" as const, notes: "187 000 км", reservedFor: null, lastAction: "Вчера, 11:22" },
] as const;

/** Demo seed consumables (demo-seed.server.ts). */
export const landingDemoInventory = [
  {
    id: "demo-item-oil-filter",
    sku: "FLT-OIL-001",
    name: "Масляный фильтр",
    brandName: "Mann",
    onHand: 24,
    reserved: 1,
    available: 23,
    location: "A-08",
    sellPrice: 4200,
  },
  {
    id: "demo-item-oil-5w30",
    sku: "OIL-5W30-4L",
    name: "Масло 5W-30, 4 л",
    brandName: "Castrol",
    onHand: 18,
    reserved: 1,
    available: 17,
    location: "A-09",
    sellPrice: 9800,
  },
  {
    id: "demo-item-coolant",
    sku: "CLT-RED-1L",
    name: "Антифриз G12, 1 л",
    brandName: "Febi",
    onHand: 36,
    reserved: 0,
    available: 36,
    location: "B-02",
    sellPrice: 1900,
  },
  {
    id: "demo-item-brake-pads",
    sku: "BRK-FR-SET",
    name: "Колодки передние",
    brandName: "Akebono",
    onHand: 6,
    reserved: 0,
    available: 6,
    location: "C-14",
    sellPrice: 22000,
    lowStock: true,
  },
] as const;

/** Demo seed work orders. */
export const landingDemoWorkOrders = [
  {
    id: "demo-wo-0142",
    number: "НЗ-2026-0142",
    status: "delivered" as const,
    statusLabel: "Выдан",
    clientName: "Алексей Ким",
    vehicleLabel: "Hyundai Sonata NF",
    vin: "KMHEF41BP8A123456",
    comment: "Замена двигателя G4KC, диагностика после установки",
    grandTotal: 126000,
    laborLines: [
      { title: "Снятие и установка двигателя", hours: 8, unitPrice: 12000 },
      { title: "Диагностика и первый запуск", hours: 2, unitPrice: 8000 },
    ],
    partLines: [
      { sku: "FLT-OIL-001", name: "Масляный фильтр", quantity: 1, unitPrice: 4200 },
      { sku: "OIL-5W30-4L", name: "Масло 5W-30, 4 л", quantity: 1, unitPrice: 9800 },
    ],
  },
  {
    id: "demo-wo-0148",
    number: "НЗ-2026-0148",
    status: "in_progress" as const,
    statusLabel: "В работе",
    clientName: "Марат Садыков",
    vehicleLabel: "Toyota Camry",
    vin: "JTDBF32K504123789",
    comment: "ТО: масло, фильтры, диагностика подвески",
    grandTotal: 23300,
    laborLines: [{ title: "Замена масла и фильтров", hours: 1.5, unitPrice: 9000 }],
    partLines: [
      { sku: "OIL-5W30-4L", name: "Масло 5W-30, 4 л", quantity: 1, unitPrice: 9800 },
    ],
  },
  {
    id: "demo-wo-0151",
    number: "НЗ-2026-0151",
    status: "waiting_parts" as const,
    statusLabel: "Ждёт запчасти",
    clientName: "Олег Воронов",
    vehicleLabel: "Kia Optima",
    vin: "KNAGM4A75D5123456",
    comment: "Замена передних колодок",
    grandTotal: 29500,
    laborLines: [{ title: "Замена передних колодок", hours: 1, unitPrice: 7500 }],
    partLines: [
      { sku: "BRK-FR-SET", name: "Колодки передние", quantity: 1, unitPrice: 22000 },
    ],
  },
] as const;

const openOrders = landingDemoWorkOrders.filter((o) => o.status !== "delivered").length;

export const landingDemoMissionControl = {
  companyName: "AutoCore Service",
  spacesLabel: "1 пространство",
  revenueToday: 513_000,
  revenueDelta: 18.4,
  balance: 5_500_000,
  balanceDelta: 0,
  motorsOnHand: 2_242,
  motorsDelta: 0,
  warehouseSku: 500,
  warehouseDelta: -2.1,
  openOrders: openOrders,
  stockSkus: landingDemoInventory.length,
  online: 4,
  nav: [
    { id: "dashboard", label: "Дашборд", count: null },
    { id: "warehouse", label: "Склад", count: 2742 },
    { id: "documents", label: "Документы", count: 18 },
    { id: "sales", label: "Продажи", count: 6 },
    { id: "work-orders", label: "Заказ-наряды", count: openOrders },
    { id: "earnings", label: "Мои начисления", count: null },
    { id: "finance", label: "Финансы", count: null },
  ],
  alerts: [
    { text: "Колодки передние · остаток 6 · C-14", tone: "warning" as const },
    { text: "НЗ-2026-0151 ждёт запчасти", tone: "warning" as const },
    { text: "G4KC · A-12 · готов к продаже", tone: "info" as const },
  ],
  activity: [
    { user: "Данияр А.", text: "Резерв G4KC · полка A-12", time: "12:41" },
    { user: "Сергей М.", text: "НЗ-2026-0148 · в работе", time: "12:18" },
    { user: "Офис", text: "Документ · акт по НЗ-2026-0142", time: "11:52" },
  ],
} as const;

export function formatKzt(value: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value);
}
