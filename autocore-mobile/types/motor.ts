export const MOTOR_STATUSES = [
  'draft',
  'intake_in_progress',
  'awaiting_verification',
  'quarantine',
  'rejected',
  'available',
  'reserved',
  'installed',
  'sold',
] as const;

export type MotorStatus = (typeof MOTOR_STATUSES)[number];

export type MotorEntity = {
  id: string;
  companyId: string;
  localId?: number;
  engineId?: number;
  serialCode: string;
  configuration: string;
  notes: string;
  /** Shop grade `1` / `2` / `3` (fair / excellent / poor), same field as the web grid. */
  quality?: string;
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
  /** Catalog photos — same `photoUrls` field the web motors grid writes. */
  photoUrls?: string[];
  status?: MotorStatus;
  intakeJobId?: string | null;
  intakeStatus?: string | null;
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
