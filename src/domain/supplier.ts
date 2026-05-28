export type Supplier = {
  id: string;
  companyId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateSupplierInput = {
  companyId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  actorUserId?: string;
};
