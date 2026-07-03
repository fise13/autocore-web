import "server-only";

import { buildWarrantyVerifyUrl } from "@/components/documents/shared/document-qr";
import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";
import { buildDocumentQrDataUri } from "@/lib/documents/qr-code";
import { documentVehicleHistoryUrl } from "@/lib/documents/work-order-insights";

export async function resolveDocumentQrDataUri(
  slug: DocumentSlug,
  context: DocumentContext,
): Promise<string | undefined> {
  if (slug === "work-order") {
    return buildDocumentQrDataUri(documentVehicleHistoryUrl(context)).catch(() => undefined);
  }

  if (slug === "engine-warranty" && context.warrantyVerificationToken) {
    return buildDocumentQrDataUri(buildWarrantyVerifyUrl(context.warrantyVerificationToken)).catch(
      () => undefined,
    );
  }

  return undefined;
}
