export type VehicleEntity = {
  id: string;
  companyId: string;
  clientId: string;
  make: string;
  model: string;
  year?: number;
  vin: string;
  licensePlate: string;
  currentMileage: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdByUserId?: string;
  updatedByUserId?: string;
};

export type VehicleServiceHistoryEntry = {
  id: string;
  companyId: string;
  vehicleId: string;
  workOrderId: string;
  date: Date;
  workTypes: string[];
  motorId?: string;
  mileage: number;
  documentIds: string[];
};

export type CreateVehicleInput = Omit<VehicleEntity, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type UpdateVehicleInput = Partial<
  Pick<
    VehicleEntity,
    | "clientId"
    | "make"
    | "model"
    | "year"
    | "vin"
    | "licensePlate"
    | "currentMileage"
    | "updatedByUserId"
  >
>;
