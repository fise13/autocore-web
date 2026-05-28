import { z } from "zod";

import { OPERATION_ACCOUNTS, OPERATION_TYPES, PAYMENT_METHODS } from "@/domain/financial-operation";
import {
  INVENTORY_ITEM_STATUSES,
  INVENTORY_ITEM_TYPES,
} from "@/domain/inventory";
import { MOVEMENT_TYPES } from "@/domain/inventory-movement";
import { USER_ROLES } from "@/domain/user";

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
  relatedInventoryItemId: z.string().trim().nullable().optional(),
  relatedMovementId: z.string().trim().nullable().optional(),
  relatedWarehouseId: z.string().trim().nullable().optional(),
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
