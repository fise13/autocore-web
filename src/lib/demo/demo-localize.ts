import { DEMO_COMPANY_ID } from "@/lib/demo/demo-config";
import {
  DEMO_CLIENT_IDS,
  DEMO_ITEM_IDS,
  DEMO_MOTOR_IDS,
  DEMO_WAREHOUSE_ID,
  DEMO_WORK_ORDER_IDS,
} from "@/lib/demo/demo-ids";
import { userCopy } from "@/lib/user-copy";

const DEMO_OWNER_NAMES = new Set(["Демо AutoCore", "Demo AutoCore"]);

export function localizeDemoCompanyName(
  companyId: string | null | undefined,
  name?: string | null,
): string {
  if (companyId === DEMO_COMPANY_ID) return userCopy.demo.companyName;
  return name?.trim() || "";
}

export function localizeDemoOwnerName(name: string | null | undefined): string | null {
  if (!name) return name ?? null;
  if (DEMO_OWNER_NAMES.has(name.trim())) return userCopy.demo.ownerName;
  return name;
}

export function localizeDemoClientName(clientId: string, fallback: string): string {
  const labels = userCopy.demo.clients;
  if (clientId === DEMO_CLIENT_IDS.alexey) return labels.alexey;
  if (clientId === DEMO_CLIENT_IDS.marat) return labels.marat;
  if (clientId === DEMO_CLIENT_IDS.oleg) return labels.oleg;
  return fallback;
}

export function localizeDemoItemName(itemId: string, fallback: string): string {
  const labels = userCopy.demo.items;
  if (itemId === DEMO_ITEM_IDS.oilFilter) return labels.oilFilter;
  if (itemId === DEMO_ITEM_IDS.oil) return labels.oil;
  if (itemId === DEMO_ITEM_IDS.coolant) return labels.coolant;
  if (itemId === DEMO_ITEM_IDS.brakePads) return labels.brakePads;
  return fallback;
}

export function localizeDemoWarehouseName(warehouseId: string, fallback: string): string {
  if (warehouseId === DEMO_WAREHOUSE_ID) return userCopy.demo.warehouseName;
  return fallback;
}

export function localizeDemoMotorNotes(motorDocId: string, fallback: string): string {
  const notes = userCopy.demo.motorNotes;
  if (motorDocId === DEMO_MOTOR_IDS.g4kc) return notes.g4kc;
  if (motorDocId === DEMO_MOTOR_IDS.twoAz) return notes.twoAz;
  if (motorDocId === DEMO_MOTOR_IDS.g4kd) return notes.g4kd;
  if (motorDocId === DEMO_MOTOR_IDS.qr25) return notes.qr25;
  if (motorDocId === DEMO_MOTOR_IDS.cjsa) return notes.cjsa;
  return fallback;
}

export function localizeDemoWorkOrderFields(input: {
  id: string;
  companyId: string;
  number: string;
  clientId: string;
  clientName?: string;
  comment?: string;
  laborLines: Array<{ id: string; title: string }>;
  partLines: Array<{ itemId?: string; name: string }>;
}): {
  number: string;
  clientName?: string;
  comment?: string;
  laborLines: Array<{ id: string; title: string }>;
  partLines: Array<{ itemId?: string; name: string }>;
} {
  if (input.companyId !== DEMO_COMPANY_ID) return input;

  const copy = userCopy.demo.workOrders;
  const order =
    input.id === DEMO_WORK_ORDER_IDS.completed
      ? copy.completed
      : input.id === DEMO_WORK_ORDER_IDS.inProgress
        ? copy.inProgress
        : input.id === DEMO_WORK_ORDER_IDS.waitingParts
          ? copy.waitingParts
          : null;

  const laborTitles = order?.labor ?? {};
  return {
    number: order?.number ?? input.number,
    clientName: input.clientId
      ? localizeDemoClientName(input.clientId, input.clientName ?? "")
      : input.clientName,
    comment: order?.comment ?? input.comment,
    laborLines: input.laborLines.map((line) => ({
      ...line,
      title: laborTitles[line.id as keyof typeof laborTitles] ?? line.title,
    })),
    partLines: input.partLines.map((line) => ({
      ...line,
      name: line.itemId ? localizeDemoItemName(line.itemId, line.name) : line.name,
    })),
  };
}
