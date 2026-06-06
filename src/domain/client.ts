export type ClientEntity = {
  id: string;
  companyId: string;
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdByUserId?: string;
  updatedByUserId?: string;
};

export type CreateClientInput = Omit<ClientEntity, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type UpdateClientInput = Partial<
  Pick<ClientEntity, "fullName" | "phone" | "email" | "notes" | "updatedByUserId">
>;
