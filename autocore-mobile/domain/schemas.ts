import { z } from 'zod';

import { WORK_ORDER_STATUSES } from '@/types/work-order';

const workOrderLaborLineSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  pricingMode: z.enum(['hourly', 'fixed']).optional(),
  hours: z.number().nonnegative().default(0),
  unitPrice: z.number().nonnegative().default(0),
  assigneeIds: z.array(z.string()).default([]),
  assigneeDisplayNames: z.array(z.string()).optional(),
  assigneeRole: z.enum(['mechanic', 'diagnostician', 'manager']).default('mechanic'),
});

const workOrderPartLineSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().trim().optional(),
  source: z.enum(['warehouse', 'adhoc', 'specific_quick']).optional(),
  sku: z.string().trim().optional(),
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  unitCost: z.number().nonnegative().default(0),
  warehouseId: z.string().trim().optional(),
});

const workOrderMotorLineSchema = z.object({
  id: z.string().min(1),
  motorId: z.string().trim().default(''),
  serialCode: z.string().trim().default(''),
  brandName: z.string().trim().optional(),
  engineCode: z.string().trim().optional(),
  configuration: z.string().trim().optional(),
  unitPrice: z.number().nonnegative().default(0),
  outcome: z.enum(['install', 'sell']).default('install'),
});

const workOrderPricingSchema = z.object({
  laborTotal: z.number().nonnegative().default(0),
  partsTotal: z.number().nonnegative().default(0),
  motorsTotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative().default(0),
});

export const createWorkOrderSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  number: z.string().trim().optional(),
  status: z.enum(WORK_ORDER_STATUSES).default('draft'),
  clientId: z.string().min(1),
  clientName: z.string().trim().optional(),
  clientPhone: z.string().trim().optional(),
  vehicleId: z.string().min(1),
  vehicleLabel: z.string().trim().optional(),
  vin: z.string().trim().optional().default(''),
  licensePlate: z.string().trim().optional().default(''),
  mileage: z.number().nonnegative().default(0),
  comment: z.string().trim().optional(),
  laborLines: z.array(workOrderLaborLineSchema).default([]),
  partLines: z.array(workOrderPartLineSchema).default([]),
  motorLines: z.array(workOrderMotorLineSchema).default([]),
  pricing: workOrderPricingSchema.default({
    laborTotal: 0,
    partsTotal: 0,
    motorsTotal: 0,
    discount: 0,
    grandTotal: 0,
  }),
  createdByUserId: z.string().min(1),
  updatedByUserId: z.string().trim().optional(),
});

export const createClientSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(3),
  email: z.string().trim().email().optional().or(z.literal('')),
  notes: z.string().trim().optional(),
  createdByUserId: z.string().trim().optional(),
  updatedByUserId: z.string().trim().optional(),
});

export const createVehicleSchema = z.object({
  id: z.string().trim().optional(),
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  make: z.string().trim().default(''),
  model: z.string().trim().default(''),
  year: z.number().int().positive().optional(),
  vin: z.string().trim().optional().default(''),
  licensePlate: z.string().trim().optional().default(''),
  currentMileage: z.number().nonnegative().default(0),
  createdByUserId: z.string().trim().optional(),
  updatedByUserId: z.string().trim().optional(),
});
