export const MOTOR_STATUSES = ['available', 'reserved', 'installed', 'sold'] as const;

export type MotorStatus = (typeof MOTOR_STATUSES)[number];

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
  warehouseLocation?: string;
  primaryLocationId?: string;
  primaryLocationCode?: string;
  status?: MotorStatus;
  reservedForWorkOrderId?: string | null;
  installedOnVehicleId?: string | null;
};

export type MotorAvailability = 'all' | 'available' | 'sold';

export type MotorFilters = {
  uid: string;
  companyId: string;
  soldOnly?: boolean;
  availability?: MotorAvailability;
  includeDeleted?: boolean;
  search?: string;
  brandName?: string;
  engineCode?: string;
};
