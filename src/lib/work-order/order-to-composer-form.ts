import { WorkOrder } from "@/domain/work-order";
import { ComposerFormState } from "@/components/work-orders/work-order-composer";

const EMPTY_LABOR_DRAFT: ComposerFormState["laborDraft"] = {
  title: "",
  pricingMode: "fixed",
  hours: 1,
  unitPrice: 0,
  assigneeId: "",
  assigneeName: "",
  assigneeRole: "mechanic",
};

export function workOrderToComposerForm(order: WorkOrder): ComposerFormState {
  const [make, model, plate] = (order.vehicleLabel ?? "").split(" ").filter(Boolean);
  return {
    clientId: order.clientId,
    clientName: order.clientName ?? "",
    clientPhone: order.clientPhone ?? "",
    vehicleId: order.vehicleId,
    vehicleMake: make ?? "",
    vehicleModel: model ?? plate ?? "",
    vin: order.vin,
    licensePlate: order.licensePlate,
    mileage: order.mileage,
    comment: order.comment ?? "",
    laborDraft: EMPTY_LABOR_DRAFT,
    laborLines: order.laborLines,
    partSku: "",
    partName: "",
    partQuantity: 1,
    partUnitPrice: 0,
    partLines: order.partLines,
    specificCategoryId: "",
    specificPartName: "",
    specificPartPrice: 0,
    specificWarrantyTemplateId: "none",
    motorSerial: "",
    motorOutcome: "install",
    motorPrice: 0,
    motorWarrantyTemplateId: "",
    motorLines: order.motorLines,
    discount: order.pricing.discount,
  };
}
