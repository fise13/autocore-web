import { UserRole } from "@/domain/user";

export type ActivityModule =
  | "inventory"
  | "accounting"
  | "employees"
  | "settings"
  | "system"
  | "work_orders";

export type ActivitySeverity = "info" | "warning" | "critical";

export type ActivityActorContext = {
  uid: string;
  name?: string;
  role?: UserRole;
};

export type ActivityAppendPayload = {
  action: string;
  target: string;
  actor: string;
  actorName?: string;
  actorRole?: UserRole;
  module?: ActivityModule;
  targetId?: string;
  targetName?: string;
  severity?: ActivitySeverity;
  metadata?: Record<string, string | number | boolean | null>;
};
