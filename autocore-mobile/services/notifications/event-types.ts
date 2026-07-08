/** Typed notification event constants — extend here for new modules. */

export const ORDER_EVENTS = {
  ASSIGNED: 'work_order.assigned',
  AVAILABLE: 'work_order.available',
  COMPLETED: 'work_order.completed',
  STATUS_CHANGED: 'work_order.status_changed',
  EDITED: 'work_order.updated',
  CUSTOMER_CHANGED: 'work_order.customer_changed',
  VEHICLE_CHANGED: 'work_order.vehicle_changed',
  MECHANIC_CHANGED: 'work_order.mechanic_changed',
  PART_ADDED: 'work_order.part_added',
  COMMENT_ADDED: 'work_order.comment_added',
  CANCELLED: 'work_order.cancelled',
  PAYMENT_ATTACHED: 'work_order.payment_attached',
  PAYMENT_REMOVED: 'work_order.payment_removed',
  LIVE_EDITING: 'work_order.live_editing',
  CREATED: 'work_order.created',
} as const;

export const FINANCE_EVENTS = {
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_COMPLETED: 'payment.refund_completed',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  OUTSTANDING_PAYMENT: 'payment.outstanding',
  DAILY_REVENUE: 'finance.daily_revenue',
  CASH_MISMATCH: 'finance.cash_mismatch',
} as const;

export const TEAM_EVENTS = {
  INVITED: 'team.invited',
  INVITATION_ACCEPTED: 'team.invitation_accepted',
  ROLE_CHANGED: 'team.role_changed',
  PERMISSIONS_UPDATED: 'team.permissions_updated',
  REMOVED: 'team.removed',
  JOINED: 'team.joined',
} as const;

export const DOCUMENT_EVENTS = {
  PDF_GENERATED: 'document.pdf_generated',
  WARRANTY_GENERATED: 'document.warranty_generated',
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',
  IMPORT_COMPLETED: 'import.completed',
  IMPORT_FAILED: 'import.failed',
  IMPORT_PARTIAL: 'import.partial',
  DOCUMENT_IMPORT_CREATED: 'document_import.created',
  UPLOADED: 'document.uploaded',
  DELETED: 'document.deleted',
} as const;

export const SUBSCRIPTION_EVENTS = {
  EXPIRES_7D: 'subscription.expires_7d',
  EXPIRES_3D: 'subscription.expires_3d',
  EXPIRES_1D: 'subscription.expires_1d',
  RENEWED: 'subscription.renewed',
  PAYMENT_FAILED: 'subscription.payment_failed',
  CANCELLED: 'subscription.cancelled',
  RESTORED: 'subscription.restored',
} as const;

export const SYNC_EVENTS = {
  SYNCED: 'sync.completed',
  FAILED: 'sync.failed',
  CONFLICT: 'sync.conflict',
} as const;

export const ERROR_EVENTS = {
  NETWORK: 'error.network',
  AUTH_EXPIRED: 'error.auth_expired',
  PERMISSION_DENIED: 'error.permission_denied',
  UPLOAD_FAILED: 'error.upload_failed',
  DOWNLOAD_FAILED: 'error.download_failed',
  SERVER_UNAVAILABLE: 'error.server_unavailable',
  UNEXPECTED: 'error.unexpected',
} as const;

export const AI_EVENTS = {
  TASK_COMPLETED: 'ai.task_completed',
  TASK_FAILED: 'ai.task_failed',
  OCR_COMPLETED: 'ai.ocr_completed',
  VIN_RECOGNIZED: 'ai.vin_recognized',
} as const;

export const SECURITY_EVENTS = {
  LOGIN_NEW_DEVICE: 'security.login_new_device',
  PASSWORD_CHANGED: 'security.password_changed',
} as const;

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
export type FinanceEventType = (typeof FINANCE_EVENTS)[keyof typeof FINANCE_EVENTS];
export type TeamEventType = (typeof TEAM_EVENTS)[keyof typeof TEAM_EVENTS];
export type DocumentEventType = (typeof DOCUMENT_EVENTS)[keyof typeof DOCUMENT_EVENTS];
export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENTS)[keyof typeof SUBSCRIPTION_EVENTS];
export type SyncEventType = (typeof SYNC_EVENTS)[keyof typeof SYNC_EVENTS];
export type ErrorEventType = (typeof ERROR_EVENTS)[keyof typeof ERROR_EVENTS];
