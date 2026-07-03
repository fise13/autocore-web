export type CompanyModuleKey = 'motors' | 'workOrders' | 'accounting' | 'warehouse' | 'specifics';

export type CompanyAppConfig = {
  onboardingCompleted: boolean;
  modules: Record<CompanyModuleKey, boolean>;
  specificCategories: Array<{
    id: string;
    name: string;
    mode: 'tracked' | 'quick';
    groupId: string;
    subcategoryId?: string;
    warrantyDefault?: string;
  }>;
  defaultWarrantyTemplate: string;
  taxonomyVersion?: number;
  updatedAt?: Date;
};
