import { normalizeCompanyId } from "@/lib/company-id";

export function defaultWarehouseDocId(companyId: string): string {
  return `default_${normalizeCompanyId(companyId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
