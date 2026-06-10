import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentContext } from "@/lib/documents/document-context";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { documentVehicleHistoryUrl } from "@/lib/documents/work-order-insights";

export type QrTarget = {
  url: string;
  label: string;
};

export function resolveDocumentQrTarget(
  slug: DocumentSlug,
  context: DocumentContext,
  options?: { companyQrLinkUrl?: string },
): QrTarget {
  const appUrl = getAppUrl().replace(/\/$/, "");
  const companyLink = options?.companyQrLinkUrl?.trim();

  if (companyLink && /^https?:\/\//i.test(companyLink)) {
    return { url: companyLink, label: "Карточка компании" };
  }

  if (slug === "engine-warranty" && context.warrantyVerificationToken) {
    return {
      url: `${appUrl}/warranty/${context.warrantyVerificationToken}`,
      label: "Проверка гарантии",
    };
  }

  if (slug === "engine-waybill" || slug === "engine-warranty") {
    const motor = context.motors[0];
    if (motor?.id) {
      return {
        url: `${appUrl}/motors?highlight=${encodeURIComponent(motor.id)}`,
        label: "Карточка двигателя",
      };
    }
  }

  if (slug === "commercial-proposal") {
    return {
      url: `${getMarketingUrl().replace(/\/$/, "")}/contact`,
      label: "Связаться с компанией",
    };
  }

  const historyUrl = documentVehicleHistoryUrl(context);
  if (historyUrl) {
    return { url: historyUrl, label: "История автомобиля" };
  }

  return {
    url: `${appUrl}/work-orders/${encodeURIComponent(context.order.id)}`,
    label: "Карточка заказа",
  };
}
