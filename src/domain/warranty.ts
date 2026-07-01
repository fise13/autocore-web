export const WARRANTY_STATUSES = ["active", "expired", "void"] as const;

export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export type EngineWarranty = {
  id: string;
  companyId: string;
  motorId: string;
  vehicleId?: string;
  workOrderId?: string;
  clientId?: string;
  serialCode: string;
  engineCode?: string;
  vin?: string;
  licensePlate?: string;
  installedAt: Date;
  soldAt?: Date;
  saleAmount?: number;
  expiresAt: Date;
  expiresAtMileage: number;
  termsText?: string;
  restrictionsText?: string;
  warrantyLabel?: string;
  warrantyDays?: number;
  /** @deprecated Legacy field; interpreted as months × 30 when warrantyDays is absent. */
  warrantyMonths?: number;
  warrantyKm?: number;
  verificationToken: string;
  status: WarrantyStatus;
  pdfStoragePath?: string;
  downloadUrl?: string;
  soldByUserId?: string;
  createdAt: Date;
};

export type CreateWarrantyInput = Omit<EngineWarranty, "id" | "createdAt" | "status" | "verificationToken"> & {
  id?: string;
  status?: WarrantyStatus;
  verificationToken?: string;
};
