export type WorkOrderDocumentType =
  | 'work_order_pdf'
  | 'completion_act'
  | 'maintenance_tag'
  | 'engine_warranty'
  | 'client_invoice'
  | 'engine_waybill'
  | 'commercial_proposal'
  | 'vehicle_intake_act'
  | 'sales_receipt';

export type WorkOrderDocumentRecord = {
  id: string;
  companyId: string;
  workOrderId: string;
  type: WorkOrderDocumentType;
  title: string;
  slug?: string;
  status?: 'pending' | 'ready' | 'failed';
  storagePath?: string;
  downloadUrl?: string;
  contextHash?: string;
  createdAt: Date;
};

export type DocumentJobStatus = 'pending' | 'processing' | 'done' | 'failed';

export type DocumentGenerationJobRecord = {
  id: string;
  companyId: string;
  aggregateId: string;
  requestedSlugs: string[];
  completedSlugs: string[];
  failedSlugs: string[];
  status: DocumentJobStatus;
  error?: string;
  createdAt: Date;
};
