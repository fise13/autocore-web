import { Timestamp } from "firebase-admin/firestore";

import { ClientEntity } from "@/domain/client";
import { CompanyEntity } from "@/domain/company";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { CompanyEmployee } from "@/domain/rbac";
import { MotorEntity } from "@/domain/motor";
import { VehicleEntity } from "@/domain/vehicle";
import { WorkOrder, WorkOrderStatus } from "@/domain/work-order";
import { Permission, UserEntity, UserRole } from "@/domain/user";

function isFiniteDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

export function adminToDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    const parsed = value.toDate();
    return isFiniteDate(parsed) ? parsed : undefined;
  }
  if (value instanceof Date) {
    return isFiniteDate(value) ? value : undefined;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      const parsed = candidate.toDate.call(value);
      return isFiniteDate(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

export function mapAdminWorkOrder(id: string, data: Record<string, unknown>): WorkOrder {
  const createdAt = adminToDate(data.createdAt) ?? new Date();
  return {
    id,
    companyId: String(data.companyId ?? ""),
    number: String(data.number ?? id),
    status: (data.status as WorkOrderStatus) ?? "draft",
    clientId: String(data.clientId ?? ""),
    clientName: typeof data.clientName === "string" ? data.clientName : undefined,
    clientPhone: typeof data.clientPhone === "string" ? data.clientPhone : undefined,
    vehicleId: String(data.vehicleId ?? ""),
    vehicleLabel: typeof data.vehicleLabel === "string" ? data.vehicleLabel : undefined,
    vin: String(data.vin ?? ""),
    licensePlate: String(data.licensePlate ?? ""),
    mileage: Number(data.mileage ?? 0),
    comment: typeof data.comment === "string" ? data.comment : undefined,
    laborLines: Array.isArray(data.laborLines) ? (data.laborLines as WorkOrder["laborLines"]) : [],
    partLines: Array.isArray(data.partLines) ? (data.partLines as WorkOrder["partLines"]) : [],
    motorLines: Array.isArray(data.motorLines) ? (data.motorLines as WorkOrder["motorLines"]) : [],
    pricing:
      typeof data.pricing === "object" && data.pricing != null
        ? (data.pricing as WorkOrder["pricing"])
        : { laborTotal: 0, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 0 },
    paymentAccount: data.paymentAccount as WorkOrder["paymentAccount"],
    paymentMethod: data.paymentMethod as WorkOrder["paymentMethod"],
    createdByUserId: String(data.createdByUserId ?? ""),
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
    createdAt,
    updatedAt: adminToDate(data.updatedAt) ?? createdAt,
    confirmedAt: adminToDate(data.confirmedAt) ?? undefined,
    completedAt: adminToDate(data.completedAt) ?? undefined,
    deliveredAt: adminToDate(data.deliveredAt) ?? undefined,
    cancelledAt: adminToDate(data.cancelledAt) ?? undefined,
  };
}

export function mapAdminClient(id: string, data: Record<string, unknown>): ClientEntity {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    fullName: String(data.fullName ?? ""),
    phone: String(data.phone ?? ""),
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    createdAt: adminToDate(data.createdAt) ?? undefined,
    updatedAt: adminToDate(data.updatedAt) ?? undefined,
    createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

export function mapAdminVehicle(id: string, data: Record<string, unknown>): VehicleEntity {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    clientId: String(data.clientId ?? ""),
    make: String(data.make ?? ""),
    model: String(data.model ?? ""),
    year: data.year == null ? undefined : Number(data.year),
    vin: String(data.vin ?? ""),
    licensePlate: String(data.licensePlate ?? ""),
    currentMileage: Number(data.currentMileage ?? 0),
    createdAt: adminToDate(data.createdAt) ?? undefined,
    updatedAt: adminToDate(data.updatedAt) ?? undefined,
    createdByUserId: typeof data.createdByUserId === "string" ? data.createdByUserId : undefined,
    updatedByUserId: typeof data.updatedByUserId === "string" ? data.updatedByUserId : undefined,
  };
}

export function mapAdminCompany(id: string, data: Record<string, unknown>): CompanyEntity {
  const branding = companyBrandingFromRecord(data);
  return {
    id,
    name: String(data.name ?? ""),
    ownerId: String(data.ownerId ?? ""),
    legalName: typeof data.legalName === "string" ? data.legalName : undefined,
    address: typeof data.address === "string" ? data.address : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    email: branding.email ?? (typeof data.email === "string" ? data.email : undefined),
    website: branding.website ?? (typeof data.website === "string" ? data.website : undefined),
    slogan: branding.slogan,
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : undefined,
    socialHandle: branding.socialHandle,
    warrantyLabel: branding.warrantyLabel,
    warrantyText: branding.warrantyText,
    serviceIntervalKm: branding.serviceIntervalKm,
    serviceIntervalMonths: branding.serviceIntervalMonths,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    documentTheme: branding.documentTheme,
    createdAt: adminToDate(data.createdAt) ?? undefined,
  };
}

export function mapAdminEmployee(id: string, companyId: string, data: Record<string, unknown>): CompanyEmployee {
  return {
    id,
    uid: String(data.uid ?? id),
    companyId: String(data.companyId ?? companyId),
    email: String(data.email ?? ""),
    fullName: String(data.fullName ?? ""),
    role: String(data.role ?? "employee") as UserRole,
    permissions: Array.isArray(data.permissions) ? (data.permissions as Permission[]) : [],
    invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : "",
    createdAt: adminToDate(data.createdAt) ?? undefined,
    lastActiveAt: adminToDate(data.lastActiveAt) ?? undefined,
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
  };
}

export function mapAdminUser(id: string, data: Record<string, unknown>): UserEntity {
  return {
    id,
    email: String(data.email ?? ""),
    displayName: typeof data.fullName === "string" ? data.fullName : typeof data.displayName === "string" ? data.displayName : null,
    role: String(data.role ?? "employee") as UserRole,
    companyId: typeof data.companyId === "string" ? data.companyId : null,
    permissions: Array.isArray(data.permissions) ? (data.permissions as Permission[]) : undefined,
    isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
  };
}

export function mapAdminMotor(docId: string, data: Record<string, unknown>): MotorEntity | null {
  const serialCode = String(data.serialCode ?? "").trim();
  const localId = Number(data.localId ?? docId);
  if (!serialCode && !Number.isFinite(localId)) return null;

  return {
    id: String(localId || docId),
    companyId: String(data.companyId ?? ""),
    localId: Number.isFinite(localId) && localId > 0 ? localId : undefined,
    engineId: data.engineId == null ? undefined : Number(data.engineId),
    serialCode,
    configuration: String(data.configuration ?? ""),
    notes: String(data.notes ?? ""),
    quantity: Number(data.quantity ?? 1),
    transmission: String(data.transmission ?? ""),
    arrivalDate: adminToDate(data.arrivalDate) ?? null,
    soldDate: adminToDate(data.soldDate) ?? null,
    deletedAt: adminToDate(data.deletedAt) ?? null,
    createdAt: adminToDate(data.createdAt) ?? undefined,
    updatedAt: adminToDate(data.updatedAt) ?? undefined,
    brandName: typeof data.brandName === "string" ? data.brandName : "",
    engineCode: typeof data.engineCode === "string" ? data.engineCode : "",
    status: (typeof data.status === "string" ? data.status : "available") as MotorEntity["status"],
    reservedForWorkOrderId:
      typeof data.reservedForWorkOrderId === "string" ? data.reservedForWorkOrderId : null,
    installedOnVehicleId:
      typeof data.installedOnVehicleId === "string" ? data.installedOnVehicleId : null,
  };
}
