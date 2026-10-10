import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DONOR_STATUSES } from "@/domain/donor";
import { IMPORT_BATCH_STATUSES } from "@/domain/import-batch";
import { INVENTORY_IMPORT_STATUSES } from "@/domain/inventory-import";
import { MOTOR_STATUSES } from "@/domain/motor";
import { PAYROLL_TRANSACTION_STATUSES } from "@/domain/payroll-transaction";
import { QUOTE_STATUSES } from "@/domain/quote";
import { USED_PART_STATUSES } from "@/domain/used-part";
import { WARRANTY_STATUSES } from "@/domain/warranty";
import { WORK_ORDER_STATUSES } from "@/domain/work-order";
import {
  donorStatusStyle,
  importBatchStatusStyle,
  inventoryImportStatusStyle,
  motorStatusStyle,
  payrollStatusStyle,
  quoteStatusStyle,
  usedPartStatusStyle,
  warrantyStatusStyle,
  workOrderStatusStyle,
} from "@/lib/status/status-tones";

const registries = [
  ["work order", WORK_ORDER_STATUSES, workOrderStatusStyle],
  ["motor", MOTOR_STATUSES, motorStatusStyle],
  ["used part", USED_PART_STATUSES, usedPartStatusStyle],
  ["donor", DONOR_STATUSES, donorStatusStyle],
  ["payroll", PAYROLL_TRANSACTION_STATUSES, payrollStatusStyle],
  ["inventory import", INVENTORY_IMPORT_STATUSES, inventoryImportStatusStyle],
  ["import batch", IMPORT_BATCH_STATUSES, importBatchStatusStyle],
  ["warranty", WARRANTY_STATUSES, warrantyStatusStyle],
  ["quote", QUOTE_STATUSES, quoteStatusStyle],
] as const;

describe("status tone registry", () => {
  it("covers every domain status with a tone and an icon", () => {
    for (const [name, statuses, registry] of registries) {
      for (const status of statuses) {
        const style = (registry as Record<string, { tone: string; icon: unknown }>)[status];
        assert.ok(style, `${name}: ${status} has no style`);
        assert.ok(style.icon, `${name}: ${status} has no icon`);
      }
    }
  });

  it("keeps closed business outcomes out of the danger tone", () => {
    assert.equal(workOrderStatusStyle.cancelled.tone, "neutral");
    assert.equal(workOrderStatusStyle.delivered.tone, "neutral");
    assert.equal(motorStatusStyle.sold.tone, "neutral");
    assert.equal(usedPartStatusStyle.sold.tone, "neutral");
    assert.equal(payrollStatusStyle.cancelled.tone, "neutral");
  });

  it("gives list and detail views the same work-order tone", () => {
    assert.equal(workOrderStatusStyle.confirmed.tone, "info");
    assert.equal(workOrderStatusStyle.in_progress.tone, "info");
  });
});
