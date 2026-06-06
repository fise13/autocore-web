export const MOTOR_STATUSES = ["available", "reserved", "installed", "sold"] as const;

export type MotorStatus = (typeof MOTOR_STATUSES)[number];

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
  quantity: number;
  transmission: string;
  arrivalDate: Date | null;
  soldDate?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  brandName?: string;
  engineCode?: string;
  status?: MotorStatus;
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
  quantity?: number;
  transmission?: string;
  arrivalDate?: Date | null;
  soldDate?: Date | null;
  deletedAt?: Date | null;
  brandName?: string;
  engineCode?: string;
  status?: MotorStatus;
  reservedForWorkOrderId?: string | null;
  installedOnVehicleId?: string | null;
  installedWorkOrderId?: string | null;
  warrantyId?: string | null;
};
