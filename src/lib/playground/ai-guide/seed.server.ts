import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ROLE_PERMISSIONS } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AI_GUIDE_COMPANY_ID } from "@/lib/playground/ai-guide/config";
import {
  AI_GUIDE_CLIENT_IDS,
  AI_GUIDE_DOCUMENT_IDS,
  AI_GUIDE_EMPLOYEE_IDS,
  AI_GUIDE_ITEM_IDS,
  AI_GUIDE_MOTOR_IDS,
  AI_GUIDE_VEHICLE_IDS,
  AI_GUIDE_WAREHOUSE_ID,
  AI_GUIDE_WORK_ORDER_IDS,
} from "@/lib/playground/ai-guide/ids";

function ts(date: string): Timestamp {
  return Timestamp.fromDate(new Date(date));
}

const MOTORS = [
  {
    id: AI_GUIDE_MOTOR_IDS.ej20g,
    brandName: "Subaru",
    engineCode: "EJ20G",
    configuration: "2.0 turbo",
    serialCode: "EJ20G-44821",
    transmission: "MT",
    location: "A-04",
    notes: "GC8 WRX closed-deck. Compression even. List $2,850.",
    quality: "A",
    quantity: 2,
  },
  {
    id: AI_GUIDE_MOTOR_IDS.ej257,
    brandName: "Subaru",
    engineCode: "EJ257",
    configuration: "2.5 turbo",
    serialCode: "EJ257-90214",
    transmission: "MT",
    location: "A-12",
    notes: "STi short-block, forged pistons. List $4,200.",
    quality: "A",
    quantity: 1,
  },
  {
    id: AI_GUIDE_MOTOR_IDS.jz1,
    brandName: "Toyota",
    engineCode: "1JZ-GTE",
    configuration: "2.5 twin-turbo",
    serialCode: "1JZ-77410",
    transmission: "AT",
    location: "B-08",
    notes: "VVTi Chaser mill, oil-pan dry. List $5,400.",
    quality: "A",
    quantity: 1,
  },
  {
    id: AI_GUIDE_MOTOR_IDS.k20a,
    brandName: "Honda",
    engineCode: "K20A",
    configuration: "2.0 i-VTEC",
    serialCode: "K20A-33188",
    transmission: "MT",
    location: "B-02",
    notes: "DC5 Type R, VTEC engagement clean. List $3,150.",
    quality: "A",
    quantity: 3,
  },
  {
    id: AI_GUIDE_MOTOR_IDS.rb26,
    brandName: "Nissan",
    engineCode: "RB26DETT",
    configuration: "2.6 twin-turbo",
    serialCode: "RB26-11002",
    transmission: "MT",
    location: "C-01",
    notes: "BNR34 long-block. Straight oil galleries. List $8,900.",
    quality: "A",
    quantity: 1,
  },
  {
    id: AI_GUIDE_MOTOR_IDS.jz2,
    brandName: "Toyota",
    engineCode: "2JZ-GTE",
    configuration: "3.0 twin-turbo",
    serialCode: "2JZ-55190",
    transmission: "MT",
    location: "C-06",
    notes: "Aristo VVTi, rebuilt head. List $7,200.",
    quality: "B",
    quantity: 1,
  },
] as const;

/** Idempotent upsert of Ridgeway operational data. Never writes another companyId. */
export async function seedAiGuideWorkspaceData(ownerUid: string): Promise<void> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(AI_GUIDE_COMPANY_ID);
  const batch = db.batch();

  batch.set(db.collection("warehouses").doc(AI_GUIDE_WAREHOUSE_ID), {
    companyId: AI_GUIDE_COMPANY_ID,
    name: "Killingsworth shop",
    code: "MAIN",
    isDefault: true,
    isActive: true,
    createdByUserId: ownerUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const teammates = [
    {
      id: AI_GUIDE_EMPLOYEE_IDS.manager,
      email: "priya.nandakumar@ridgeway.example",
      fullName: "Priya Nandakumar",
      role: "manager" as const,
    },
    {
      id: AI_GUIDE_EMPLOYEE_IDS.mechanic,
      email: "marcus.webb@ridgeway.example",
      fullName: "Marcus Webb",
      role: "mechanic" as const,
    },
    {
      id: AI_GUIDE_EMPLOYEE_IDS.warehouse,
      email: "dana.okonkwo@ridgeway.example",
      fullName: "Dana Okonkwo",
      role: "employee" as const,
      extraPermissions: ["warehouse_manage", "inventory_edit"] as const,
    },
  ];

  for (const teammate of teammates) {
    const extra = teammate.extraPermissions ? [...teammate.extraPermissions] : [];
    const permissions = [...ROLE_PERMISSIONS[teammate.role], ...extra];
    batch.set(companyRef.collection("employees").doc(teammate.id), {
      uid: teammate.id,
      companyId: AI_GUIDE_COMPANY_ID,
      email: teammate.email,
      fullName: teammate.fullName,
      role: teammate.role,
      permissions,
      invitedBy: ownerUid,
      isActive: true,
      lastActiveAt: ts("2026-09-04T16:40:00"),
      createdAt: ts("2026-03-12T09:00:00"),
    });
  }

  const consumables = [
    {
      id: AI_GUIDE_ITEM_IDS.oilFilter,
      sku: "FLT-SUB-EJ",
      name: "Oil filter — Subaru EJ",
      brandName: "Mahle",
      purchasePrice: 9.4,
      sellPrice: 18,
      totalOnHand: 42,
      warehouseLocation: "A-08",
    },
    {
      id: AI_GUIDE_ITEM_IDS.oil,
      sku: "OIL-5W40-5L",
      name: "Motul 300V 5W-40 5L",
      brandName: "Motul",
      purchasePrice: 62,
      sellPrice: 94,
      totalOnHand: 16,
      warehouseLocation: "A-09",
    },
    {
      id: AI_GUIDE_ITEM_IDS.coolant,
      sku: "CLT-RED-1G",
      name: "OEM red coolant 1 gal",
      brandName: "Peak",
      purchasePrice: 11,
      sellPrice: 19,
      totalOnHand: 28,
      warehouseLocation: "B-02",
    },
    {
      id: AI_GUIDE_ITEM_IDS.gasketSet,
      sku: "GST-1JZ-FH",
      name: "1JZ-GTE full gasket set",
      brandName: "Toyota",
      purchasePrice: 210,
      sellPrice: 340,
      totalOnHand: 4,
      warehouseLocation: "B-11",
    },
    {
      id: AI_GUIDE_ITEM_IDS.timingBelt,
      sku: "TB-EJ20-KIT",
      name: "EJ20 timing belt kit",
      brandName: "Gates",
      purchasePrice: 185,
      sellPrice: 295,
      totalOnHand: 6,
      warehouseLocation: "A-14",
    },
    {
      id: AI_GUIDE_ITEM_IDS.sparkPlugs,
      sku: "SP-IK22-6",
      name: "NGK IK22 iridium (set of 6)",
      brandName: "NGK",
      purchasePrice: 48,
      sellPrice: 84,
      totalOnHand: 11,
      warehouseLocation: "C-03",
      lowStockThreshold: 4,
    },
  ];

  for (const [index, item] of consumables.entries()) {
    const stockValue = item.totalOnHand * item.purchasePrice;
    batch.set(db.collection("inventoryItems").doc(item.id), {
      companyId: AI_GUIDE_COMPANY_ID,
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
        .doc(`${AI_GUIDE_COMPANY_ID}_${item.id}_${AI_GUIDE_WAREHOUSE_ID}`),
      {
        companyId: AI_GUIDE_COMPANY_ID,
        itemId: item.id,
        warehouseId: AI_GUIDE_WAREHOUSE_ID,
        onHand: item.totalOnHand,
        reserved: 0,
        available: item.totalOnHand,
        updatedAt: FieldValue.serverTimestamp(),
      },
    );
  }

  const clients = [
    { id: AI_GUIDE_CLIENT_IDS.elena, fullName: "Elena Voss", phone: "+1 503 555 0192" },
    { id: AI_GUIDE_CLIENT_IDS.caleb, fullName: "Caleb Ortiz", phone: "+1 971 555 0164" },
    { id: AI_GUIDE_CLIENT_IDS.naomi, fullName: "Naomi Park", phone: "+1 206 555 0133" },
    { id: AI_GUIDE_CLIENT_IDS.frank, fullName: "Frank Moretti", phone: "+1 415 555 0177" },
  ];

  for (const client of clients) {
    batch.set(companyRef.collection("clients").doc(client.id), {
      companyId: AI_GUIDE_COMPANY_ID,
      fullName: client.fullName,
      phone: client.phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const vehicles = [
    {
      id: AI_GUIDE_VEHICLE_IDS.wrx,
      clientId: AI_GUIDE_CLIENT_IDS.elena,
      make: "Subaru",
      model: "Impreza WRX GC8",
      vin: "JF1GC435XWG512348",
      licensePlate: "OR-WRX 04",
      mileage: 142800,
    },
    {
      id: AI_GUIDE_VEHICLE_IDS.chaser,
      clientId: AI_GUIDE_CLIENT_IDS.caleb,
      make: "Toyota",
      model: "Chaser JZX100",
      vin: "JZX100-0045123",
      licensePlate: "OR-JZX 98",
      mileage: 118400,
    },
    {
      id: AI_GUIDE_VEHICLE_IDS.integra,
      clientId: AI_GUIDE_CLIENT_IDS.naomi,
      make: "Honda",
      model: "Integra Type R DC5",
      vin: "DC5-2001331",
      licensePlate: "WA-K20 01",
      mileage: 96400,
    },
    {
      id: AI_GUIDE_VEHICLE_IDS.skyline,
      clientId: AI_GUIDE_CLIENT_IDS.frank,
      make: "Nissan",
      model: "Skyline GT-R BNR34",
      vin: "BNR34-0088210",
      licensePlate: "CA-R34 99",
      mileage: 87200,
    },
  ];

  for (const vehicle of vehicles) {
    batch.set(companyRef.collection("vehicles").doc(vehicle.id), {
      companyId: AI_GUIDE_COMPANY_ID,
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
      id: AI_GUIDE_WORK_ORDER_IDS.delivered,
      number: "WO-2026-0188",
      status: "delivered",
      clientId: AI_GUIDE_CLIENT_IDS.elena,
      clientName: "Elena Voss",
      clientPhone: "+1 503 555 0192",
      vehicleId: AI_GUIDE_VEHICLE_IDS.wrx,
      vehicleLabel: "Subaru Impreza WRX GC8",
      vin: "JF1GC435XWG512348",
      licensePlate: "OR-WRX 04",
      mileage: 142800,
      comment: "EJ20G swap, timing belt, break-in oil. Customer drove it home Friday.",
      laborLines: [
        {
          id: "l1",
          title: "Engine swap — EJ20G",
          hours: 14,
          unitPrice: 95,
          assigneeIds: [AI_GUIDE_EMPLOYEE_IDS.mechanic],
          assigneeRole: "mechanic",
        },
      ],
      partLines: [
        {
          id: "p1",
          itemId: AI_GUIDE_ITEM_IDS.timingBelt,
          source: "warehouse",
          sku: "TB-EJ20-KIT",
          name: "EJ20 timing belt kit",
          quantity: 1,
          unitPrice: 295,
          unitCost: 185,
        },
        {
          id: "p2",
          itemId: AI_GUIDE_ITEM_IDS.oil,
          source: "warehouse",
          sku: "OIL-5W40-5L",
          name: "Motul 300V 5W-40 5L",
          quantity: 1,
          unitPrice: 94,
          unitCost: 62,
        },
      ],
      motorLines: [
        {
          id: "m1",
          motorId: AI_GUIDE_MOTOR_IDS.ej20g,
          serialCode: "EJ20G-44821",
          brandName: "Subaru",
          engineCode: "EJ20G",
          configuration: "2.0 turbo",
          unitPrice: 2850,
          outcome: "install",
        },
      ],
      pricing: { laborTotal: 1330, partsTotal: 389, motorsTotal: 2850, discount: 0, grandTotal: 4569 },
      confirmedAt: ts("2026-08-18T10:00:00"),
      completedAt: ts("2026-08-22T16:10:00"),
      deliveredAt: ts("2026-08-22T17:40:00"),
      createdAt: ts("2026-08-18T09:20:00"),
      updatedAt: ts("2026-08-22T17:40:00"),
    },
    {
      id: AI_GUIDE_WORK_ORDER_IDS.inProgress,
      number: "WO-2026-0194",
      status: "in_progress",
      clientId: AI_GUIDE_CLIENT_IDS.caleb,
      clientName: "Caleb Ortiz",
      clientPhone: "+1 971 555 0164",
      vehicleId: AI_GUIDE_VEHICLE_IDS.chaser,
      vehicleLabel: "Toyota Chaser JZX100",
      vin: "JZX100-0045123",
      licensePlate: "OR-JZX 98",
      mileage: 118400,
      comment: "1JZ-GTE install. Waiting on exhaust manifold gaskets from the gasket set.",
      laborLines: [
        {
          id: "l1",
          title: "1JZ-GTE install",
          hours: 11,
          unitPrice: 95,
          assigneeIds: [AI_GUIDE_EMPLOYEE_IDS.mechanic],
          assigneeRole: "mechanic",
        },
      ],
      partLines: [
        {
          id: "p1",
          itemId: AI_GUIDE_ITEM_IDS.gasketSet,
          source: "warehouse",
          sku: "GST-1JZ-FH",
          name: "1JZ-GTE full gasket set",
          quantity: 1,
          unitPrice: 340,
          unitCost: 210,
        },
      ],
      motorLines: [
        {
          id: "m1",
          motorId: AI_GUIDE_MOTOR_IDS.jz1,
          serialCode: "1JZ-77410",
          brandName: "Toyota",
          engineCode: "1JZ-GTE",
          configuration: "2.5 twin-turbo",
          unitPrice: 5400,
          outcome: "install",
        },
      ],
      pricing: { laborTotal: 1045, partsTotal: 340, motorsTotal: 5400, discount: 0, grandTotal: 6785 },
      confirmedAt: ts("2026-08-28T11:00:00"),
      createdAt: ts("2026-08-28T10:15:00"),
      updatedAt: ts("2026-09-03T14:20:00"),
    },
    {
      id: AI_GUIDE_WORK_ORDER_IDS.waitingParts,
      number: "WO-2026-0197",
      status: "waiting_parts",
      clientId: AI_GUIDE_CLIENT_IDS.naomi,
      clientName: "Naomi Park",
      clientPhone: "+1 206 555 0133",
      vehicleId: AI_GUIDE_VEHICLE_IDS.integra,
      vehicleLabel: "Honda Integra Type R DC5",
      vin: "DC5-2001331",
      licensePlate: "WA-K20 01",
      mileage: 96400,
      comment: "K20A refresh. Waiting on a second valve-cover gasket — not in stock.",
      laborLines: [
        {
          id: "l1",
          title: "K20A leak-down and reseal",
          hours: 6,
          unitPrice: 95,
          assigneeIds: [AI_GUIDE_EMPLOYEE_IDS.mechanic],
          assigneeRole: "mechanic",
        },
      ],
      partLines: [
        {
          id: "p1",
          itemId: AI_GUIDE_ITEM_IDS.sparkPlugs,
          source: "warehouse",
          sku: "SP-IK22-6",
          name: "NGK IK22 iridium (set of 6)",
          quantity: 1,
          unitPrice: 84,
          unitCost: 48,
        },
      ],
      motorLines: [
        {
          id: "m1",
          motorId: AI_GUIDE_MOTOR_IDS.k20a,
          serialCode: "K20A-33188",
          brandName: "Honda",
          engineCode: "K20A",
          configuration: "2.0 i-VTEC",
          unitPrice: 3150,
          outcome: "install",
        },
      ],
      pricing: { laborTotal: 570, partsTotal: 84, motorsTotal: 3150, discount: 0, grandTotal: 3804 },
      confirmedAt: ts("2026-09-01T09:30:00"),
      createdAt: ts("2026-09-01T09:00:00"),
      updatedAt: ts("2026-09-04T11:10:00"),
    },
    {
      id: AI_GUIDE_WORK_ORDER_IDS.confirmed,
      number: "WO-2026-0201",
      status: "confirmed",
      clientId: AI_GUIDE_CLIENT_IDS.frank,
      clientName: "Frank Moretti",
      clientPhone: "+1 415 555 0177",
      vehicleId: AI_GUIDE_VEHICLE_IDS.skyline,
      vehicleLabel: "Nissan Skyline GT-R BNR34",
      vin: "BNR34-0088210",
      licensePlate: "CA-R34 99",
      mileage: 87200,
      comment: "Pre-purchase inspection and compression test on the RB26 before a possible refresh.",
      laborLines: [
        {
          id: "l1",
          title: "RB26 compression / leak-down",
          hours: 2,
          unitPrice: 110,
          assigneeIds: [AI_GUIDE_EMPLOYEE_IDS.manager],
          assigneeRole: "diagnostician",
        },
      ],
      partLines: [],
      motorLines: [],
      pricing: { laborTotal: 220, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 220 },
      confirmedAt: ts("2026-09-04T13:00:00"),
      createdAt: ts("2026-09-04T12:40:00"),
      updatedAt: ts("2026-09-04T13:00:00"),
    },
  ];

  for (const order of workOrders) {
    const payload: Record<string, unknown> = {
      companyId: AI_GUIDE_COMPANY_ID,
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

  batch.set(companyRef.collection("meta").doc("workOrderCounter"), { value: 201 }, { merge: true });

  for (const [index, motor] of MOTORS.entries()) {
    batch.set(db.collection("users").doc(ownerUid).collection("motors").doc(motor.id), {
      companyId: AI_GUIDE_COMPANY_ID,
      localId: index + 1,
      engineId: index + 1,
      serialCode: motor.serialCode,
      configuration: motor.configuration,
      notes: motor.notes,
      quality: motor.quality,
      photoUrls: [],
      quantity: motor.quantity,
      transmission: motor.transmission,
      arrivalDate: ts("2026-04-02T10:00:00"),
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
      createdAt: ts("2026-04-02T10:00:00"),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const documents = [
    {
      id: AI_GUIDE_DOCUMENT_IDS.wo188,
      aggregateId: AI_GUIDE_WORK_ORDER_IDS.delivered,
      slug: "work-order",
      type: "work_order_pdf",
      title: "Work order WO-2026-0188",
    },
    {
      id: AI_GUIDE_DOCUMENT_IDS.warranty188,
      aggregateId: AI_GUIDE_WORK_ORDER_IDS.delivered,
      slug: "engine-warranty",
      type: "engine_warranty",
      title: "Engine warranty — EJ20G",
    },
    {
      id: AI_GUIDE_DOCUMENT_IDS.invoice194,
      aggregateId: AI_GUIDE_WORK_ORDER_IDS.inProgress,
      slug: "invoice",
      type: "client_invoice",
      title: "Invoice WO-2026-0194",
    },
  ];

  for (const doc of documents) {
    batch.set(companyRef.collection("documentInstances").doc(doc.id), {
      companyId: AI_GUIDE_COMPANY_ID,
      aggregateType: "work_order",
      aggregateId: doc.aggregateId,
      slug: doc.slug,
      type: doc.type,
      title: doc.title,
      theme: "modern",
      storagePath: "",
      version: 1,
      generatedAt: ts("2026-08-22T17:00:00"),
      contextHash: "playground-seed",
    });
  }

  batch.set(companyRef.collection("documentGenerationJobs").doc("aig-job-wo-0188"), {
    companyId: AI_GUIDE_COMPANY_ID,
    aggregateType: "work_order",
    aggregateId: AI_GUIDE_WORK_ORDER_IDS.delivered,
    requestedSlugs: ["work-order", "engine-warranty"],
    completedSlugs: ["work-order", "engine-warranty"],
    failedSlugs: [],
    status: "done",
    createdAt: ts("2026-08-22T16:50:00"),
    updatedAt: ts("2026-08-22T17:00:00"),
  });

  await batch.commit();
}
