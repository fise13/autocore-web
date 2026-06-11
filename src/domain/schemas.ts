import { z } from "zod";

import { OPERATION_ACCOUNTS, OPERATION_TYPES, PAYMENT_METHODS } from "@/domain/financial-operation";
import { DOMAIN_EVENT_TYPES } from "@/domain/domain-event";
import {
  INVENTORY_ITEM_STATUSES,
  INVENTORY_ITEM_TYPES,
} from "@/domain/inventory";
import { MOVEMENT_TYPES } from "@/domain/inventory-movement";
import { MOTOR_STATUSES } from "@/domain/motor";
import { USER_ROLES } from "@/domain/user";
import {
  WORK_ORDER_ASSIGNEE_ROLES,
  WORK_ORDER_LABOR_PRICING_MODES,
  WORK_ORDER_MOTOR_OUTCOMES,
  WORK_ORDER_STATUSES,
} from "@/domain/work-order";

export const userRoleSchema = z.enum(USER_ROLES);

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: userRoleSchema,
  companyId: z.string().nullable(),
});

export const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  ownerId: z.string().min(1),
  legalName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  email: z.string().trim().optional(),
  website: z.string().trim().optional(),
  slogan: z.string().trim().optional(),
  primaryColor: z.string().trim().optional(),
  secondaryColor: z.string().trim().optional(),
  createdAt: z.date().optional(),
});

export const operationTypeSchema = z.enum(OPERATION_TYPES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const operationAccountSchema = z.enum(OPERATION_ACCOUNTS);

export const createFinancialOperationSchema = z.object({
  companyId: z.string().min(1),
  type: operationTypeSchema,
  amount: z.number().positive(),
  paymentMethod: paymentMethodSchema,
  account: operationAccountSchema,
  cashReceived: z.number().nonnegative().nullable().optional(),
  changeGiven: z.number().nonnegative().nullable().optional(),
  relatedMotorID: z.number().int().nullable().optional(),
  relatedMotorId: z.string().trim().nullable().optional(),
  relatedInventoryItemId: z.string().trim().nullable().optional(),
  relatedMovementId: z.string().trim().nullable().optional(),
  relatedWarehouseId: z.string().trim().nullable().optional(),
  relatedWorkOrderId: z.string().trim().nullable().optional(),
  costBasis: z.number().nonnegative().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
  category: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  source: z.string().trim().nullable().optional(),
  details: z.string().trim().nullable().optional(),
  createdByUserId: z.string().min(1),
});

export const financialOperationSchema = createFinancialOperationSchema.extend({
  id: z.string().min(1),
  cloudDocumentId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const upsertMotorSchema = z.object({
  companyId: z.string().min(1),
  localId: z.number().int().optional(),
  engineId: z.number().int().nonnegative().optional(),
  serialCode: z.string().min(1),
  configuration: z.string().default(""),
  notes: z.string().default(""),
  quantity: z.number().int().positive().default(1),
  transmission: z.string().default(""),
  arrivalDate: z.date().default(() => new Date()),
  soldDate: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  brandName: z.string().default(""),
  engineCode: z.string().default(""),
  status: z.enum(MOTOR_STATUSES).optional(),
  reservedForWorkOrderId: z.string().nullable().optional(),
  installedOnVehicleId: z.string().nullable().optional(),
});

export const inventoryItemTypeSchema = z.enum(INVENTORY_ITEM_TYPES);
export const inventoryItemStatusSchema = z.enum(INVENTORY_ITEM_STATUSES);
export const movementTypeSchema = z.enum(MOVEMENT_TYPES);

export const upsertInventoryItemSchema = z.object({
  companyId: z.string().min(1),
  localId: z.number().int().optional(),
  type: inventoryItemTypeSchema.default("generic"),
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  barcodes: z.array(z.string().trim()).default([]),
  brandId: z.string().trim().optional(),
  brandName: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),
  warehouseLocation: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  categoryPath: z.array(z.string().trim()).optional(),
  unit: z.string().trim().default("шт"),
  purchasePrice: z.number().nonnegative().optional(),
  averageCost: z.number().nonnegative().optional(),
  sellPrice: z.number().nonnegative().optional(),
  currency: z.string().trim().default("KZT"),
  status: inventoryItemStatusSchema.default("active"),
  lowStockThreshold: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  actorUserId: z.string().trim().optional(),
});

export const recordMovementSchema = z.object({
  companyId: z.string().min(1),
  itemId: z.string().min(1),
  warehouseId: z.string().min(1),
  type: movementTypeSchema,
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
  referenceType: z.enum(["purchase", "sale", "work_order", "transfer", "import", "manual"]).optional(),
  referenceId: z.string().trim().optional(),
  documentId: z.string().trim().optional(),
  reason: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
  reversalOfMovementId: z.string().trim().optional(),
  actorUserId: z.string().min(1),
  adjustmentDirection: z.enum(["increase", "decrease"]).optional(),
});

export const workOrderStatusSchema = z.enum(WORK_ORDER_STATUSES);
export const workOrderAssigneeRoleSchema = z.enum(WORK_ORDER_ASSIGNEE_ROLES);
export const workOrderMotorOutcomeSchema = z.enum(WORK_ORDER_MOTOR_OUTCOMES);

export const workOrderLaborPricingModeSchema = z.enum(WORK_ORDER_LABOR_PRICING_MODES);

export const workOrderLaborLineSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  pricingMode: workOrderLaborPricingModeSchema.default("fixed"),
  hours: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  assigneeIds: z.array(z.string().min(1)).default([]),
  assigneeDisplayNames: z.array(z.string().trim().min(1)).optional(),
  assigneeRole: workOrderAssigneeRoleSchema.default("mechanic"),
});

export const workOrderPartLineSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().trim().optional(),
  source: z.enum(["warehouse", "adhoc", "specific_quick"]).optional(),
  specificCategoryId: z.string().trim().optional(),
  specificCategoryName: z.string().trim().optional(),
  warrantyTemplateId: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  unitCost: z.number().nonnegative(),
  warehouseId: z.string().trim().optional(),
});

export const workOrderMotorLineSchema = z.object({
  id: z.string().min(1),
  motorId: z.string().min(1),
  serialCode: z.string().trim().min(1),
  brandName: z.string().trim().optional(),
  engineCode: z.string().trim().optional(),
  configuration: z.string().trim().optional(),
  unitPrice: z.number().nonnegative(),
  outcome: workOrderMotorOutcomeSchema.default("install"),
  warrantyTemplateId: z.string().trim().optional(),
});

export const workOrderPricingSchema = z.object({
  laborTotal: z.number().nonnegative(),
  partsTotal: z.number().nonnegative(),
  motorsTotal: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
});

export const createWorkOrderSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  number: z.string().trim().optional(),
  status: workOrderStatusSchema.default("draft"),
  clientId: z.string().min(1),
  clientName: z.string().trim().optional(),
  clientPhone: z.string().trim().optional(),
  vehicleId: z.string().min(1),
  vehicleLabel: z.string().trim().optional(),
  vin: z.string().trim().optional().default(""),
  licensePlate: z.string().trim().optional().default(""),
  mileage: z.number().nonnegative().default(0),
  comment: z.string().trim().optional(),
  laborLines: z.array(workOrderLaborLineSchema).default([]),
  partLines: z.array(workOrderPartLineSchema).default([]),
  motorLines: z.array(workOrderMotorLineSchema).default([]),
  pricing: workOrderPricingSchema,
  paymentAccount: operationAccountSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  createdByUserId: z.string().min(1),
  updatedByUserId: z.string().trim().optional(),
});

export const createClientSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(3),
  email: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  createdByUserId: z.string().trim().optional(),
  updatedByUserId: z.string().trim().optional(),
});

export const createVehicleSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  make: z.string().trim().default(""),
  model: z.string().trim().default(""),
  year: z.number().int().positive().optional(),
  vin: z.string().trim().optional().default(""),
  licensePlate: z.string().trim().optional().default(""),
  currentMileage: z.number().nonnegative().default(0),
  createdByUserId: z.string().trim().optional(),
  updatedByUserId: z.string().trim().optional(),
});

export const domainEventTypeSchema = z.enum(DOMAIN_EVENT_TYPES);

export const createDomainEventSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  type: domainEventTypeSchema,
  aggregateType: z.literal("work_order"),
  aggregateId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().min(1),
  status: z.enum(["pending", "processed", "failed"]).default("pending"),
  error: z.string().trim().optional(),
});
