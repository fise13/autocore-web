import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { Quote } from "@/domain/quote";
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
import { formatWorkOrderLabel } from "@/lib/work-order/work-order-display";

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

function quoteAsWorkOrder(quote: Quote): WorkOrder {
  return {
    id: quote.id,
    companyId: quote.companyId,
    number: `КП-${quote.id.slice(0, 6).toUpperCase()}`,
    status: "draft",
    clientId: quote.clientId,
    clientName: quote.clientName,
    clientPhone: quote.clientPhone,
    vehicleId: quote.vehicleId ?? "",
    vehicleLabel: quote.vehicleLabel,
    vin: quote.vin ?? "",
    licensePlate: quote.licensePlate ?? "",
    mileage: quote.mileage ?? 0,
    comment: quote.comment,
    laborLines: quote.laborLines,
    partLines: quote.partLines,
    motorLines: quote.motorLines,
    pricing: quote.pricing,
    paymentMethod: "cash",
    paymentAccount: "cashbox",
    createdByUserId: quote.createdByUserId,
    updatedByUserId: quote.createdByUserId,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}

export async function loadQuoteDocumentContext(companyId: string, quoteId: string): Promise<DocumentContext> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const quoteSnap = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("quotes")
    .doc(quoteId)
    .get();

  if (!quoteSnap.exists) {
    throw new Error("Коммерческое предложение не найдено");
  }

  const data = quoteSnap.data() as Record<string, unknown>;
  const quote: Quote = {
    id: quoteSnap.id,
    companyId: String(data.companyId ?? normalizedCompanyId),
    clientId: String(data.clientId ?? ""),
    clientName: typeof data.clientName === "string" ? data.clientName : undefined,
    clientPhone: typeof data.clientPhone === "string" ? data.clientPhone : undefined,
    vehicleId: typeof data.vehicleId === "string" ? data.vehicleId : undefined,
    vehicleLabel: typeof data.vehicleLabel === "string" ? data.vehicleLabel : undefined,
    vin: typeof data.vin === "string" ? data.vin : undefined,
    licensePlate: typeof data.licensePlate === "string" ? data.licensePlate : undefined,
    mileage: data.mileage == null ? undefined : Number(data.mileage),
    comment: typeof data.comment === "string" ? data.comment : undefined,
    laborLines: Array.isArray(data.laborLines) ? (data.laborLines as Quote["laborLines"]) : [],
    partLines: Array.isArray(data.partLines) ? (data.partLines as Quote["partLines"]) : [],
    motorLines: Array.isArray(data.motorLines) ? (data.motorLines as Quote["motorLines"]) : [],
    pricing:
      typeof data.pricing === "object" && data.pricing != null
        ? (data.pricing as Quote["pricing"])
        : { laborTotal: 0, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 0 },
    status: (data.status as Quote["status"]) ?? "draft",
    validUntil: data.validUntil instanceof Timestamp ? data.validUntil.toDate() : undefined,
    convertedWorkOrderId: typeof data.convertedWorkOrderId === "string" ? data.convertedWorkOrderId : undefined,
    documentInstanceId: typeof data.documentInstanceId === "string" ? data.documentInstanceId : undefined,
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };

  const order = quoteAsWorkOrder(quote);

  const [companySnapshot, clientSnapshot, vehicleSnapshot, employeesSnapshot] = await Promise.all([
    db.collection("companies").doc(normalizedCompanyId).get(),
    quote.clientId
      ? db.collection("companies").doc(normalizedCompanyId).collection("clients").doc(quote.clientId).get()
      : Promise.resolve(null),
    quote.vehicleId
      ? db.collection("companies").doc(normalizedCompanyId).collection("vehicles").doc(quote.vehicleId).get()
      : Promise.resolve(null),
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

  const client =
    clientSnapshot?.exists === true
      ? mapAdminClient(clientSnapshot.id, clientSnapshot.data() as Record<string, unknown>)
      : null;

  const vehicle =
    vehicleSnapshot?.exists === true
      ? mapAdminVehicle(vehicleSnapshot.id, vehicleSnapshot.data() as Record<string, unknown>)
      : null;

  const employees = employeesSnapshot.docs.map((doc) =>
    mapAdminEmployee(doc.id, normalizedCompanyId, doc.data() as Record<string, unknown>),
  );

  const motorIds = [...new Set(order.motorLines.map((line) => line.motorId).filter(Boolean))];
  const motors = (
    await Promise.all(motorIds.map((motorId) => fetchMotorById(normalizedCompanyId, motorId)))
  ).filter((motor): motor is MotorEntity => motor != null);

  return buildDocumentContext({
    company,
    companyRecord: companyData ?? undefined,
    order,
    orderLabel: formatWorkOrderLabel(order),
    client,
    vehicle,
    motors,
    employees,
    logoDataUri,
    vehicleLogbook: [],
  });
}
