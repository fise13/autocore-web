export const mobileApi = {
  workOrders: '/api/mobile/work-orders',
  workOrder: (id: string) => `/api/mobile/work-orders/${id}`,
  workOrderTransition: (id: string) => `/api/mobile/work-orders/${id}/transition`,
  workOrderAddPart: (id: string) => `/api/mobile/work-orders/${id}/add-part`,
  scanResolve: '/api/mobile/scan/resolve',
  scanFeedback: '/api/mobile/scan/feedback',
  scanOcr: '/api/mobile/scan/ocr',
  scanDisambiguate: '/api/mobile/scan/disambiguate',
  scanExportEvents: '/api/mobile/scan/export-events',
  inventoryQuickReceive: '/api/mobile/inventory/quick-receive',
  accountAvatar: '/api/account/avatar',
  invitesSend: '/api/invites/send',
} as const;
