import { WorkOrder } from "@/domain/work-order";
import { DocumentContext } from "@/lib/documents/document-context";
import { DEFAULT_COMPANY_PRIMARY_COLOR, DEFAULT_COMPANY_SECONDARY_COLOR } from "@/domain/company-branding";

/** Lightweight context for client-side document policy (no Firestore reads). */
export function buildDocumentContextFromOrder(order: WorkOrder): DocumentContext {
  return {
    company: {
      name: "Сервис",
      primaryColor: DEFAULT_COMPANY_PRIMARY_COLOR,
      secondaryColor: DEFAULT_COMPANY_SECONDARY_COLOR,
    },
    order,
    orderLabel: order.number,
    client: order.clientId
      ? {
          id: order.clientId,
          companyId: order.companyId,
          fullName: order.clientName ?? "",
          phone: order.clientPhone ?? "",
        }
      : null,
    vehicle: order.vehicleId
      ? {
          id: order.vehicleId,
          companyId: order.companyId,
          clientId: order.clientId,
          make: order.vehicleLabel?.split(" ")[0] ?? "",
          model: order.vehicleLabel?.split(" ").slice(1).join(" ") ?? "",
          vin: order.vin,
          licensePlate: order.licensePlate,
          currentMileage: order.mileage ?? 0,
        }
      : null,
    motors: [],
    employees: [],
    assigneeNames: new Map(),
    vehicleLogbook: [],
    generatedAt: new Date(),
    locale: "ru-KZ",
    theme: "modern",
  };
}
