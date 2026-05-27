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
};
