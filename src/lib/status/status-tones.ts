/**
 * One status → tone + icon registry for every domain entity.
 *
 * Colour communicates the class of state; the label carries the exact state.
 * Five tones only. Closed outcomes (sold, delivered, cancelled) are neutral:
 * red is reserved for errors, rejections and blocked stock.
 * See docs/AUTOCORE_DESIGN_LANGUAGE.md §3.5.
 */
import {
  Ban,
  Bookmark,
  CarFront,
  CircleAlert,
  CircleArrowRight,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock,
  HandCoins,
  LoaderCircle,
  PackageSearch,
  Recycle,
  ShieldAlert,
  Undo2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { DonorStatus } from "@/domain/donor";
import type { ImportBatchStatus } from "@/domain/import-batch";
import type { InventoryImportStatus } from "@/domain/inventory-import";
import type { MotorStatus } from "@/domain/motor";
import type { PayrollTransactionStatus } from "@/domain/payroll-transaction";
import type { QuoteStatus } from "@/domain/quote";
import type { UsedPartStatus } from "@/domain/used-part";
import type { WarrantyStatus } from "@/domain/warranty";
import type { WorkOrderStatus } from "@/domain/work-order";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusStyle = {
  tone: StatusTone;
  icon: LucideIcon;
};

export const workOrderStatusStyle: Record<WorkOrderStatus, StatusStyle> = {
  draft: { tone: "neutral", icon: CircleDashed },
  confirmed: { tone: "info", icon: CircleArrowRight },
  in_progress: { tone: "info", icon: CircleDot },
  waiting_parts: { tone: "warning", icon: PackageSearch },
  completed: { tone: "success", icon: CircleCheck },
  delivered: { tone: "neutral", icon: CarFront },
  cancelled: { tone: "neutral", icon: Ban },
};

export const motorStatusStyle: Record<MotorStatus, StatusStyle> = {
  draft: { tone: "neutral", icon: CircleDashed },
  intake_in_progress: { tone: "info", icon: CircleDot },
  awaiting_verification: { tone: "warning", icon: Clock },
  quarantine: { tone: "danger", icon: ShieldAlert },
  rejected: { tone: "danger", icon: CircleX },
  available: { tone: "success", icon: CircleCheck },
  reserved: { tone: "warning", icon: Bookmark },
  installed: { tone: "neutral", icon: Wrench },
  sold: { tone: "neutral", icon: HandCoins },
};

export const usedPartStatusStyle: Record<UsedPartStatus, StatusStyle> = {
  available: { tone: "success", icon: CircleCheck },
  reserved: { tone: "warning", icon: Bookmark },
  sold: { tone: "neutral", icon: HandCoins },
  scrapped: { tone: "neutral", icon: Recycle },
};

export const donorStatusStyle: Record<DonorStatus, StatusStyle> = {
  intake: { tone: "neutral", icon: CircleDashed },
  in_progress: { tone: "info", icon: CircleDot },
  dismantled: { tone: "success", icon: CircleCheck },
  scrapped: { tone: "neutral", icon: Recycle },
};

export const payrollStatusStyle: Record<PayrollTransactionStatus, StatusStyle> = {
  pending: { tone: "warning", icon: Clock },
  paid: { tone: "success", icon: CircleCheck },
  cancelled: { tone: "neutral", icon: Ban },
};

export const inventoryImportStatusStyle: Record<InventoryImportStatus, StatusStyle> = {
  parsing: { tone: "info", icon: LoaderCircle },
  preview: { tone: "info", icon: CircleDot },
  applying: { tone: "info", icon: LoaderCircle },
  completed: { tone: "success", icon: CircleCheck },
  failed: { tone: "danger", icon: CircleAlert },
  cancelled: { tone: "neutral", icon: Ban },
  rolled_back: { tone: "neutral", icon: Undo2 },
};

export const importBatchStatusStyle: Record<ImportBatchStatus, StatusStyle> = {
  collecting: { tone: "info", icon: CircleDot },
  processing: { tone: "info", icon: LoaderCircle },
  review: { tone: "warning", icon: Clock },
  applying: { tone: "info", icon: LoaderCircle },
  completed: { tone: "success", icon: CircleCheck },
  failed: { tone: "danger", icon: CircleAlert },
  expired: { tone: "neutral", icon: Clock },
  cancelled: { tone: "neutral", icon: Ban },
};

export const warrantyStatusStyle: Record<WarrantyStatus, StatusStyle> = {
  active: { tone: "success", icon: CircleCheck },
  expired: { tone: "neutral", icon: Clock },
  void: { tone: "danger", icon: CircleX },
};

export const quoteStatusStyle: Record<QuoteStatus, StatusStyle> = {
  draft: { tone: "neutral", icon: CircleDashed },
  sent: { tone: "info", icon: CircleArrowRight },
  accepted: { tone: "success", icon: CircleCheck },
  expired: { tone: "neutral", icon: Clock },
  converted: { tone: "neutral", icon: CircleCheck },
};

/** Text colour for a tone when it is used outside a badge (inline status text, deltas). */
export const statusToneTextClass: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-primary-on-subtle",
  success: "text-success-on-subtle",
  warning: "text-warning-on-subtle",
  danger: "text-danger-on-subtle",
};

/** Subtle chip classes for a tone (fill, text, border) — the Badge tone recipe. */
export const statusToneChipClass: Record<StatusTone, string> = {
  neutral: "border-neutral-border bg-neutral-subtle text-neutral-on-subtle",
  info: "border-primary-border bg-primary-subtle text-primary-on-subtle",
  success: "border-success-border bg-success-subtle text-success-on-subtle",
  warning: "border-warning-border bg-warning-subtle text-warning-on-subtle",
  danger: "border-danger-border bg-danger-subtle text-danger-on-subtle",
};
