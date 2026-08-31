import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { DEMO_COMPANY_ID } from "@/lib/demo/demo-config";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { userCopyEn } from "@/lib/user-copy.en";

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

const copy = userCopyEn.demo;

function ts(date: string): Timestamp {
  return Timestamp.fromDate(new Date(date));
}

const DEMO_MOTORS = [
  {
    id: "demo-motor-g4kc",
    brandName: "Hyundai",
    engineCode: "G4KC",
    configuration: "2.4 MPI",
    serialCode: "G4KC-88421",
    transmission: "AT",
    location: "A-12",
    notes: copy.motorNotes.g4kc,
    quality: "A",
  },
  {
    id: "demo-motor-2az",
    brandName: "Toyota",
    engineCode: "2AZ-FE",
    configuration: "2.4",
    serialCode: "2AZ-44102",
    transmission: "AT",
    location: "B-04",
    notes: copy.motorNotes.twoAz,
    quality: "A",
  },
  {
    id: "demo-motor-g4kd",
    brandName: "Kia",
    engineCode: "G4KD",
    configuration: "2.0",
    serialCode: "G4KD-22901",
    transmission: "MT",
    location: "A-18",
    notes: copy.motorNotes.g4kd,
    quality: "B",
  },
  {
    id: "demo-motor-qr25",
    brandName: "Nissan",
    engineCode: "QR25DE",
    configuration: "2.5",
    serialCode: "QR25-77410",
    transmission: "AT",
    location: "C-07",
    notes: copy.motorNotes.qr25,
    quality: "A",
  },
  {
    id: "demo-motor-cjsa",
    brandName: "Volkswagen",
    engineCode: "CJSA",
    configuration: "1.8 TSI",
    serialCode: "CJSA-90331",
    transmission: "DSG",
    location: "B-11",
    notes: copy.motorNotes.cjsa,
    quality: "A",
  },
] as const;

/** Seeds demo motors, clients, vehicles, consumables and work orders. Idempotent upsert. */
export async function seedDemoWorkspaceData(ownerUid: string): Promise<void> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(DEMO_COMPANY_ID);

  const batch = db.batch();

  batch.set(db.collection("warehouses").doc(DEMO_WAREHOUSE_ID), {
    companyId: DEMO_COMPANY_ID,
    name: copy.warehouseName,
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
      name: copy.items.oilFilter,
      brandName: "Mann",
      purchasePrice: 2800,
      sellPrice: 4200,
      totalOnHand: 24,
      warehouseLocation: "A-08",
    },
    {
      id: DEMO_ITEM_IDS.oil,
      sku: "OIL-5W30-4L",
      name: copy.items.oil,
      brandName: "Castrol",
      purchasePrice: 6200,
      sellPrice: 9800,
      totalOnHand: 18,
      warehouseLocation: "A-09",
    },
    {
      id: DEMO_ITEM_IDS.coolant,
      sku: "CLT-RED-1L",
      name: copy.items.coolant,
      brandName: "Febi",
      purchasePrice: 1100,
      sellPrice: 1900,
      totalOnHand: 36,
      warehouseLocation: "B-02",
    },
    {
      id: DEMO_ITEM_IDS.brakePads,
      sku: "BRK-FR-SET",
      name: copy.items.brakePads,
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
      unit: "pcs",
      purchasePrice: item.purchasePrice,
      averageCost: item.purchasePrice,
      sellPrice: item.sellPrice,
      currency: "USD",
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
      fullName: copy.clients.alexey,
      phone: "+7 701 234 56 78",
    },
    {
      id: DEMO_CLIENT_IDS.marat,
      fullName: copy.clients.marat,
      phone: "+7 707 555 12 34",
    },
    {
      id: DEMO_CLIENT_IDS.oleg,
      fullName: copy.clients.oleg,
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
      number: copy.workOrders.completed.number,
      status: "delivered",
      clientId: DEMO_CLIENT_IDS.alexey,
      clientName: copy.clients.alexey,
      clientPhone: "+7 701 234 56 78",
      vehicleId: DEMO_VEHICLE_IDS.sonata,
      vehicleLabel: "Hyundai Sonata NF",
      vin: "KMHEF41BP8A123456",
      licensePlate: "A 123 BCD",
      mileage: 184200,
      comment: copy.workOrders.completed.comment,
      laborLines: [
        {
          id: "l1",
          title: copy.workOrders.completed.labor.l1,
          hours: 8,
          unitPrice: 12000,
          assigneeIds: [ownerUid],
          assigneeRole: "mechanic",
        },
        {
          id: "l2",
          title: copy.workOrders.completed.labor.l2,
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
          name: copy.items.oilFilter,
          quantity: 1,
          unitPrice: 4200,
          unitCost: 2800,
        },
        {
          id: "p2",
          itemId: DEMO_ITEM_IDS.oil,
          source: "warehouse",
          sku: "OIL-5W30-4L",
          name: copy.items.oil,
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
      number: copy.workOrders.inProgress.number,
      status: "in_progress",
      clientId: DEMO_CLIENT_IDS.marat,
      clientName: copy.clients.marat,
      clientPhone: "+7 707 555 12 34",
      vehicleId: DEMO_VEHICLE_IDS.camry,
      vehicleLabel: "Toyota Camry",
      vin: "JTDBF32K504123789",
      licensePlate: "B 456 EFG",
      mileage: 156800,
      comment: copy.workOrders.inProgress.comment,
      laborLines: [
        {
          id: "l1",
          title: copy.workOrders.inProgress.labor.l1,
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
          name: copy.items.oil,
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
      number: copy.workOrders.waitingParts.number,
      status: "waiting_parts",
      clientId: DEMO_CLIENT_IDS.oleg,
      clientName: copy.clients.oleg,
      clientPhone: "+7 747 111 88 99",
      vehicleId: DEMO_VEHICLE_IDS.optima,
      vehicleLabel: "Kia Optima",
      vin: "KNAGM4A75D5123456",
      licensePlate: "C 789 HIJ",
      mileage: 201400,
      comment: copy.workOrders.waitingParts.comment,
      laborLines: [
        {
          id: "l1",
          title: copy.workOrders.waitingParts.labor.l1,
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
          name: copy.items.brakePads,
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
    const payload: Record<string, unknown> = {
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
    if ("completedAt" in order) payload.completedAt = order.completedAt;
    if ("deliveredAt" in order) payload.deliveredAt = order.deliveredAt;
    batch.set(companyRef.collection("workOrders").doc(order.id), payload);
  }

  batch.set(companyRef.collection("meta").doc("workOrderCounter"), { value: 151 }, { merge: true });

  for (const [index, motor] of DEMO_MOTORS.entries()) {
    batch.set(db.collection("users").doc(ownerUid).collection("motors").doc(motor.id), {
      companyId: DEMO_COMPANY_ID,
      localId: index + 1,
      engineId: index + 1,
      serialCode: motor.serialCode,
      configuration: motor.configuration,
      notes: motor.notes,
      quality: motor.quality,
      photoUrls: [],
      quantity: 1,
      transmission: motor.transmission,
      arrivalDate: ts("2026-02-01T10:00:00"),
      soldDate: null,
      deletedAt: null,
      brandName: motor.brandName,
      engineCode: motor.engineCode,
      warehouseLocation: motor.location,
      primaryLocationCode: motor.location,
      status: "available",
      reservedForWorkOrderId: null,
      installedOnVehicleId: null,
      donorId: null,
      createdAt: ts("2026-02-01T10:00:00"),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}
