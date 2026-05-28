export type Warehouse = {
  id: string;
  companyId: string;
  localId?: number;
  name: string;
  code?: string;
  isDefault: boolean;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateWarehouseInput = {
  companyId: string;
  name: string;
  code?: string;
  isDefault?: boolean;
  address?: string;
  localId?: number;
  actorUserId?: string;
};
