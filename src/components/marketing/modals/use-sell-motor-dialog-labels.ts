"use client";

import { useTranslations } from "next-intl";

import type { SellMotorDialogLabels } from "@/components/motors/sell-motor-dialog";

/** Marketing-localized labels for the real SellMotorDialog used in demos. */
export function useSellMotorDialogLabels(): SellMotorDialogLabels {
  const t = useTranslations("marketing.modals.sellMotor");

  return {
    titleSell: t("titleSell"),
    titleReturn: t("titleReturn"),
    description: (serial, warrantySuffix) =>
      t("description", { serial, warrantySuffix: warrantySuffix ? t("warrantySuffix") : "" }),
    selectMotor: t("selectMotor"),
    buyer: t("buyer"),
    fullName: t("fullName"),
    phone: t("phone"),
    namePlaceholder: t("namePlaceholder"),
    buyerHint: t("buyerHint"),
    frequentlyBought: t("frequentlyBought"),
    skuLabel: t("skuLabel"),
    commentSellPrefix: t("commentSellPrefix"),
    commentReturnPrefix: t("commentReturnPrefix"),
    amount: t("amount"),
    account: t("account"),
    payment: t("payment"),
    cashbox: t("cashbox"),
    kaspi: t("kaspi"),
    cash: t("cash"),
    transfer: t("transfer"),
    mixed: t("mixed"),
    warrantyTitle: t("warrantyTitle"),
    warrantyDays: t("warrantyDays"),
    warrantyKm: t("warrantyKm"),
    warrantyLabel: t("warrantyLabel"),
    warrantyText: t("warrantyText"),
    warrantyTextPlaceholder: t("warrantyTextPlaceholder"),
    comment: t("comment"),
    cancel: t("cancel"),
    sell: t("sell"),
    return: t("return"),
    saving: t("saving"),
    errors: {
      amount: t("errors.amount"),
      buyerName: t("errors.buyerName"),
      buyerPhone: t("errors.buyerPhone"),
      warrantyDays: t("errors.warrantyDays"),
      warrantyKm: t("errors.warrantyKm"),
      warrantyText: t("errors.warrantyText"),
      generic: t("errors.generic"),
    },
  };
}
