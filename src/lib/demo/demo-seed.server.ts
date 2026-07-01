import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { DEMO_COMPANY_ID } from "@/lib/demo/demo-config";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";

const DEMO_WAREHOUSE_ID = "demo-warehouse-main";
const DEMO_CLIENT_IDS = {
  alexey: "demo-client-alexey",
  marat: "demo-client-marat",
  oleg: "demo-client-oleg",
} as const;

const DEMO_VEHICLE_IDS = {
  sonata: "demo-vehicle-sonata",
  camry: "demo-vehicle-camry",
  optima: "demo-vehicle-optima",
} as const;

const DEMO_ITEM_IDS = {
  oilFilter: "demo-item-oil-filter",
  oil: "demo-item-oil-5w30",
  coolant: "demo-item-coolant",
  brakePads: "demo-item-brake-pads",
} as const;

const DEMO_WORK_ORDER_IDS = {
  completed: "demo-wo-0142",
  inProgress: "demo-wo-0148",
  waitingParts: "demo-wo-0151",
} as const;

function ts(date: string): Timestamp {
  return Timestamp.fromDate(new Date(date));
}

/** Seeds demo clients, vehicles, consumables and work orders after reset. Idempotent. */
export async function seedDemoWorkspaceData(ownerUid: string): Promise<void> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(DEMO_COMPANY_ID);

  const existingOrders = await companyRef.collection("workOrders").limit(1).get();
  if (!existingOrders.empty) return;

  const batch = db.batch();

  batch.set(db.collection("warehouses").doc(DEMO_WAREHOUSE_ID), {
    companyId: DEMO_COMPANY_ID,
    name: "Основной склад",
    code: "MAIN",
    isDefault: true,
    isActive: true,
    createdByUserId: ownerUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const consumables = [
    {
      id: DEMO_ITEM_IDS.oilFilter,
      sku: "FLT-OIL-001",
      name: "Масляный фильтр",
      brandName: "Mann",
      purchasePrice: 2800,
      sellPrice: 4200,
      totalOnHand: 24,
      warehouseLocation: "A-08",
    },
    {
      id: DEMO_ITEM_IDS.oil,
      sku: "OIL-5W30-4L",
      name: "Масло 5W-30, 4 л",
      brandName: "Castrol",
      purchasePrice: 6200,
      sellPrice: 9800,
      totalOnHand: 18,
      warehouseLocation: "A-09",
    },
    {
      id: DEMO_ITEM_IDS.coolant,
      sku: "CLT-RED-1L",
      name: "Антифриз G12, 1 л",
      brandName: "Febi",
      purchasePrice: 1100,
      sellPrice: 1900,
      totalOnHand: 36,
      warehouseLocation: "B-02",
    },
    {
      id: DEMO_ITEM_IDS.brakePads,
      sku: "BRK-FR-SET",
      name: "Колодки передние",
      brandName: "Akebono",
      purchasePrice: 14500,
      sellPrice: 22000,
      totalOnHand: 6,
      warehouseLocation: "C-14",
      lowStockThreshold: 4,
    },
  ];

  for (const [index, item] of consumables.entries()) {
    const stockValue = item.totalOnHand * item.purchasePrice;
    batch.set(db.collection("inventoryItems").doc(item.id), {
      companyId: DEMO_COMPANY_ID,
      localId: index + 1,
      type: "consumable",
      sku: item.sku,
      name: item.name,
      brandName: item.brandName,
      inventoryGroup: "consumables",
      unit: "шт",
      purchasePrice: item.purchasePrice,
      averageCost: item.purchasePrice,
      sellPrice: item.sellPrice,
      currency: "KZT",
      totalOnHand: item.totalOnHand,
      totalReserved: 0,
      totalAvailable: item.totalOnHand,
      stockValue,
      status: "active",
      warehouseLocation: item.warehouseLocation,
      lowStockThreshold: item.lowStockThreshold ?? 2,
      barcodes: [],
      searchTokens: [item.sku.toLowerCase(), item.name.toLowerCase()],
      createdByUserId: ownerUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.set(
      db
        .collection("inventoryStockLevels")
        .doc(`${DEMO_COMPANY_ID}_${item.id}_${DEMO_WAREHOUSE_ID}`),
      {
        companyId: DEMO_COMPANY_ID,
        itemId: item.id,
        warehouseId: DEMO_WAREHOUSE_ID,
        onHand: item.totalOnHand,
        reserved: 0,
        available: item.totalOnHand,
        updatedAt: FieldValue.serverTimestamp(),
      },
    );
  }

  const clients = [
    {
      id: DEMO_CLIENT_IDS.alexey,
      fullName: "Алексей Ким",
      phone: "+7 701 234 56 78",
    },
    {
      id: DEMO_CLIENT_IDS.marat,
      fullName: "Марат Садыков",
      phone: "+7 707 555 12 34",
    },
    {
      id: DEMO_CLIENT_IDS.oleg,
      fullName: "Олег Воронов",
      phone: "+7 747 111 88 99",
    },
  ];

  for (const client of clients) {
    batch.set(companyRef.collection("clients").doc(client.id), {
      companyId: DEMO_COMPANY_ID,
      fullName: client.fullName,
      phone: client.phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const vehicles = [
    {
      id: DEMO_VEHICLE_IDS.sonata,
      clientId: DEMO_CLIENT_IDS.alexey,
      make: "Hyundai",
      model: "Sonata NF",
      label: "Hyundai Sonata NF",
      vin: "KMHEF41BP8A123456",
      licensePlate: "A 123 BCD",
      mileage: 184200,
    },
    {
      id: DEMO_VEHICLE_IDS.camry,
      clientId: DEMO_CLIENT_IDS.marat,
      make: "Toyota",
      model: "Camry XV50",
      label: "Toyota Camry",
      vin: "JTDBF32K504123789",
      licensePlate: "B 456 EFG",
      mileage: 156800,
    },
    {
      id: DEMO_VEHICLE_IDS.optima,
      clientId: DEMO_CLIENT_IDS.oleg,
      make: "Kia",
      model: "Optima TF",
      label: "Kia Optima",
      vin: "KNAGM4A75D5123456",
      licensePlate: "C 789 HIJ",
      mileage: 201400,
    },
  ];

  for (const vehicle of vehicles) {
    batch.set(companyRef.collection("vehicles").doc(vehicle.id), {
      companyId: DEMO_COMPANY_ID,
      clientId: vehicle.clientId,
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
      licensePlate: vehicle.licensePlate,
      currentMileage: vehicle.mileage,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const workOrders = [
    {
      id: DEMO_WORK_ORDER_IDS.completed,
      number: "НЗ-2026-0142",
      status: "delivered",
      clientId: DEMO_CLIENT_IDS.alexey,
      clientName: "Алексей Ким",
      clientPhone: "+7 701 234 56 78",
      vehicleId: DEMO_VEHICLE_IDS.sonata,
      vehicleLabel: "Hyundai Sonata NF",
      vin: "KMHEF41BP8A123456",
      licensePlate: "A 123 BCD",
      mileage: 184200,
      comment: "Замена двигателя G4KC, диагностика после установки",
      laborLines: [
        {
          id: "l1",
          title: "Снятие и установка двигателя",
          hours: 8,
          unitPrice: 12000,
          assigneeIds: [ownerUid],
          assigneeRole: "mechanic",
        },
        {
          id: "l2",
          title: "Диагностика и первый запуск",
          hours: 2,
          unitPrice: 8000,
          assigneeIds: [ownerUid],
          assigneeRole: "diagnostician",
        },
      ],
      partLines: [
        {
          id: "p1",
          itemId: DEMO_ITEM_IDS.oilFilter,
          source: "warehouse",
          sku: "FLT-OIL-001",
          name: "Масляный фильтр",
          quantity: 1,
          unitPrice: 4200,
          unitCost: 2800,
        },
        {
          id: "p2",
          itemId: DEMO_ITEM_IDS.oil,
          source: "warehouse",
          sku: "OIL-5W30-4L",
          name: "Масло 5W-30, 4 л",
          quantity: 1,
          unitPrice: 9800,
          unitCost: 6200,
        },
      ],
      motorLines: [],
      pricing: {
        laborTotal: 112000,
        partsTotal: 14000,
        motorsTotal: 0,
        discount: 0,
        grandTotal: 126000,
      },
      confirmedAt: ts("2026-06-10T10:00:00"),
      completedAt: ts("2026-06-12T16:00:00"),
      deliveredAt: ts("2026-06-12T17:30:00"),
      createdAt: ts("2026-06-10T09:00:00"),
      updatedAt: ts("2026-06-12T17:30:00"),
    },
    {
      id: DEMO_WORK_ORDER_IDS.inProgress,
      number: "НЗ-2026-0148",
      status: "in_progress",
      clientId: DEMO_CLIENT_IDS.marat,
      clientName: "Марат Садыков",
      clientPhone: "+7 707 555 12 34",
      vehicleId: DEMO_VEHICLE_IDS.camry,
      vehicleLabel: "Toyota Camry",
      vin: "JTDBF32K504123789",
      licensePlate: "B 456 EFG",
      mileage: 156800,
      comment: "ТО: масло, фильтры, диагностика подвески",
      laborLines: [
        {
          id: "l1",
          title: "Замена масла и фильтров",
          hours: 1.5,
          unitPrice: 9000,
          assigneeIds: [ownerUid],
          assigneeRole: "mechanic",
        },
      ],
      partLines: [
        {
          id: "p1",
          itemId: DEMO_ITEM_IDS.oil,
          source: "warehouse",
          sku: "OIL-5W30-4L",
          name: "Масло 5W-30, 4 л",
          quantity: 1,
          unitPrice: 9800,
          unitCost: 6200,
        },
      ],
      motorLines: [],
      pricing: {
        laborTotal: 13500,
        partsTotal: 9800,
        motorsTotal: 0,
        discount: 0,
        grandTotal: 23300,
      },
      confirmedAt: ts("2026-06-18T11:00:00"),
      createdAt: ts("2026-06-18T10:30:00"),
      updatedAt: ts("2026-06-20T14:00:00"),
    },
    {
      id: DEMO_WORK_ORDER_IDS.waitingParts,
      number: "НЗ-2026-0151",
      status: "waiting_parts",
      clientId: DEMO_CLIENT_IDS.oleg,
      clientName: "Олег Воронов",
      clientPhone: "+7 747 111 88 99",
      vehicleId: DEMO_VEHICLE_IDS.optima,
      vehicleLabel: "Kia Optima",
      vin: "KNAGM4A75D5123456",
      licensePlate: "C 789 HIJ",
      mileage: 201400,
      comment: "Замена передних колодок",
      laborLines: [
        {
          id: "l1",
          title: "Замена передних колодок",
          hours: 1,
          unitPrice: 7500,
          assigneeIds: [ownerUid],
          assigneeRole: "mechanic",
        },
      ],
      partLines: [
        {
          id: "p1",
          itemId: DEMO_ITEM_IDS.brakePads,
          source: "warehouse",
          sku: "BRK-FR-SET",
          name: "Колодки передние",
          quantity: 1,
          unitPrice: 22000,
          unitCost: 14500,
        },
      ],
      motorLines: [],
      pricing: {
        laborTotal: 7500,
        partsTotal: 22000,
        motorsTotal: 0,
        discount: 0,
        grandTotal: 29500,
      },
      confirmedAt: ts("2026-06-22T09:30:00"),
      createdAt: ts("2026-06-22T09:00:00"),
      updatedAt: ts("2026-06-23T12:00:00"),
    },
  ];

  for (const order of workOrders) {
    batch.set(companyRef.collection("workOrders").doc(order.id), {
      companyId: DEMO_COMPANY_ID,
      number: order.number,
      status: order.status,
      clientId: order.clientId,
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      vehicleId: order.vehicleId,
      vehicleLabel: order.vehicleLabel,
      vin: order.vin,
      licensePlate: order.licensePlate,
      mileage: order.mileage,
      comment: order.comment,
      laborLines: order.laborLines,
      partLines: order.partLines,
      motorLines: order.motorLines,
      pricing: order.pricing,
      createdByUserId: ownerUid,
      confirmedAt: order.confirmedAt,
      completedAt: "completedAt" in order ? order.completedAt : undefined,
      deliveredAt: "deliveredAt" in order ? order.deliveredAt : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  }

  batch.set(companyRef.collection("meta").doc("workOrderCounter"), { value: 151 }, { merge: true });

  await batch.commit();
}
