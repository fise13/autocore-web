export const MOTOR_STATUSES = [
  "draft",
  "intake_in_progress",
  "awaiting_verification",
  "quarantine",
  "rejected",
  "available",
  "reserved",
  "installed",
  "sold",
] as const;

export type MotorStatus = (typeof MOTOR_STATUSES)[number];

export const MOTOR_INTAKE_STATUSES = [
  "draft",
  "intake_in_progress",
  "awaiting_verification",
  "quarantine",
  "rejected",
] as const satisfies readonly MotorStatus[];

export function isMotorInIntake(
  motor: Pick<MotorEntity, "status">,
): boolean {
  return MOTOR_INTAKE_STATUSES.includes(
    motor.status as (typeof MOTOR_INTAKE_STATUSES)[number],
  );
}

export function isMotorAvailableForSale(
  motor: Pick<MotorEntity, "status" | "soldDate">,
): boolean {
  return !motor.soldDate && (!motor.status || motor.status === "available");
}

export type MotorHistoryEntry = {
  id: string;
  type: "reserved" | "released" | "installed" | "sold";
  workOrderId?: string;
  vehicleId?: string;
  createdAt: Date;
  actorUserId?: string;
};

export type MotorEntity = {
  id: string;
  companyId: string;
  localId?: number;
  engineId?: number;
  serialCode: string;
  configuration: string;
  notes: string;
  /** Free-text condition / grade (e.g. A / refurbished). */
  quality?: string;
  /** Firebase Storage (or data-URL fallback) photo URLs for the row. */
  photoUrls?: string[];
  quantity: number;
  transmission: string;
  arrivalDate: Date | null;
  soldDate?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  brandName?: string;
  engineCode?: string;
  /** Legacy free-text shelf; prefer primaryLocationCode when set. */
  warehouseLocation?: string;
  primaryLocationId?: string;
  primaryLocationCode?: string;
  status?: MotorStatus;
  intakeJobId?: string | null;
  intakeStatus?: string | null;
  readyForSaleAt?: Date | null;
  verifiedByUserId?: string | null;
  reservedForWorkOrderId?: string | null;
  installedOnVehicleId?: string | null;
  installedWorkOrderId?: string | null;
  warrantyId?: string | null;
  motorHistory?: MotorHistoryEntry[];
};

export type UpsertMotorInput = {
  companyId: string;
  localId?: number;
  engineId?: number;
  serialCode: string;
  configuration?: string;
  notes?: string;
  quality?: string;
  photoUrls?: string[];
  quantity?: number;
  transmission?: string;
  arrivalDate?: Date | null;
  soldDate?: Date | null;
  deletedAt?: Date | null;
  brandName?: string;
  engineCode?: string;
  warehouseLocation?: string;
  primaryLocationId?: string;
  primaryLocationCode?: string;
  status?: MotorStatus;
  intakeJobId?: string | null;
  intakeStatus?: string | null;
  reservedForWorkOrderId?: string | null;
  installedOnVehicleId?: string | null;
  installedWorkOrderId?: string | null;
  warrantyId?: string | null;
};
