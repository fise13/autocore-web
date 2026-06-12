import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { MotorEntity } from "@/domain/motor";
import { WorkOrder } from "@/domain/work-order";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  mapAdminClient,
  mapAdminCompany,
  mapAdminEmployee,
  mapAdminMotor,
  mapAdminVehicle,
} from "@/infrastructure/firestore/admin-mappers";
import { buildDocumentContext, DocumentContext } from "@/lib/documents/document-context";
import { resolveCompanyLogoDataUri } from "@/lib/documents/resolve-company-logo";
import { normalizeCompanyId } from "@/lib/company-id";
import { formatMotorLineLabel } from "@/lib/motors/format-motor-display-name";

async function fetchMotorById(companyId: string, motorId: string): Promise<MotorEntity | null> {
  const db = getAdminFirestore();
  const groupSnapshot = await db.collectionGroup("motors").where("companyId", "==", companyId).get();
  for (const doc of groupSnapshot.docs) {
    const motor = mapAdminMotor(doc.id, doc.data() as Record<string, unknown>);
    if (!motor) continue;
    if (motor.id === motorId || doc.id === motorId || String(motor.localId) === motorId) {
      return motor;
    }
  }
  return null;
}

function warrantyAsWorkOrder(params: {
  warrantyId: string;
  companyId: string;
  motor: MotorEntity;
  soldAt: Date;
  saleAmount?: number;
}): WorkOrder {
  const amount = params.saleAmount ?? 0;
  return {
    id: params.warrantyId,
    companyId: params.companyId,
    number: params.motor.serialCode || params.motor.id.slice(0, 8),
    status: "completed",
    clientId: "",
    vehicleId: "",
    vin: "",
    licensePlate: "",
    mileage: 0,
    motorLines: [
      {
        id: "motor-1",
        motorId: params.motor.id,
        brandName: params.motor.brandName,
        engineCode: params.motor.engineCode,
        configuration: params.motor.configuration,
        serialCode: params.motor.serialCode,
        outcome: "sell",
        unitPrice: amount,
      },
    ],
    laborLines: [],
    partLines: [],
    pricing: { laborTotal: 0, partsTotal: 0, motorsTotal: amount, discount: 0, grandTotal: amount },
    paymentMethod: "cash",
    paymentAccount: "cashbox",
    createdByUserId: "",
    updatedByUserId: "",
    createdAt: params.soldAt,
    updatedAt: params.soldAt,
    completedAt: params.soldAt,
  };
}

export async function loadWarrantyDocumentContext(companyId: string, warrantyId: string): Promise<DocumentContext> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const warrantySnap = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("warranties")
    .doc(warrantyId)
    .get();

  if (!warrantySnap.exists) {
    throw new Error("Гарантия не найдена");
  }

  const data = warrantySnap.data() as Record<string, unknown>;
  const motorId = String(data.motorId ?? "");
  const motor = motorId ? await fetchMotorById(normalizedCompanyId, motorId) : null;
  if (!motor) {
    throw new Error("Двигатель для гарантии не найден");
  }

  const soldAt = data.soldAt instanceof Timestamp ? data.soldAt.toDate() : new Date();
  const saleAmount = typeof data.saleAmount === "number" ? data.saleAmount : undefined;
  const workOrderId = typeof data.workOrderId === "string" ? data.workOrderId : "";

  if (workOrderId) {
    const { loadDocumentContext } = await import("@/lib/documents/load-document-context");
    const context = await loadDocumentContext(normalizedCompanyId, workOrderId);
    return {
      ...context,
      warrantyVerificationToken: String(data.verificationToken ?? ""),
    };
  }

  const order = warrantyAsWorkOrder({
    warrantyId,
    companyId: normalizedCompanyId,
    motor,
    soldAt,
    saleAmount,
  });
  const motorLabel = formatMotorLineLabel(motor, { includeSerial: true });
  const orderLabel = motorLabel !== "Двигатель" ? `Продажа двигателя · ${motorLabel}` : "Продажа двигателя";
  const [companySnapshot, employeesSnapshot] = await Promise.all([
    db.collection("companies").doc(normalizedCompanyId).get(),
    db.collection("companies").doc(normalizedCompanyId).collection("employees").get(),
  ]);

  const companyData = companySnapshot.exists ? (companySnapshot.data() as Record<string, unknown>) : null;
  const logoSource =
    typeof companyData?.logoUrl === "string"
      ? companyData.logoUrl
      : typeof companyData?.logoDataUrl === "string"
        ? companyData.logoDataUrl
        : undefined;
  const logoDataUri = await resolveCompanyLogoDataUri(logoSource);

  const company = companySnapshot.exists
    ? mapAdminCompany(companySnapshot.id, companyData as Record<string, unknown>)
    : { id: normalizedCompanyId, name: "Сервисный центр", ownerId: "" };

  const employees = employeesSnapshot.docs.map((doc) =>
    mapAdminEmployee(doc.id, normalizedCompanyId, doc.data() as Record<string, unknown>),
  );

  let client = null;
  const clientId = typeof data.clientId === "string" ? data.clientId : "";
  if (clientId) {
    const clientSnap = await db
      .collection("companies")
      .doc(normalizedCompanyId)
      .collection("clients")
      .doc(clientId)
      .get();
    if (clientSnap.exists) {
      client = mapAdminClient(clientSnap.id, clientSnap.data() as Record<string, unknown>);
    }
  }

  let vehicle = null;
  const vehicleId = typeof data.vehicleId === "string" ? data.vehicleId : "";
  if (vehicleId) {
    const vehicleSnap = await db
      .collection("companies")
      .doc(normalizedCompanyId)
      .collection("vehicles")
      .doc(vehicleId)
      .get();
    if (vehicleSnap.exists) {
      vehicle = mapAdminVehicle(vehicleSnap.id, vehicleSnap.data() as Record<string, unknown>);
    }
  }

  return buildDocumentContext({
    company,
    companyRecord: companyData ?? undefined,
    order,
    orderLabel,
    client,
    vehicle,
    motors: [motor],
    employees,
    logoDataUri,
    vehicleLogbook: [],
    warrantyVerificationToken: String(data.verificationToken ?? ""),
  });
}
