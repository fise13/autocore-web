import { z } from "zod";

import { OPERATION_ACCOUNTS, OPERATION_TYPES, PAYMENT_METHODS } from "@/domain/financial-operation";
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
