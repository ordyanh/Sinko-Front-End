export { I18nProvider, useTranslation } from "./i18n-context";
export type { Language, TranslationResources } from "./types";
export { resources, getResource } from "./resources";

export function getLocalizedOrderStatus(
  status: string,
  t: (k: string, f?: string) => string,
): string {
  switch (status) {
    case "New":
      return t("orders.statusNew", "New");
    case "Waiting for restaurant confirmation":
      return t("orders.statusWaitingConfirmation", "Needs your review");
    case "Confirmed":
      return t("orders.statusConfirmed", "Confirmed");
    case "Preparing":
      return t("orders.statusPreparing", "Preparing");
    case "Shipped":
      return t("orders.statusShipped", "Shipped");
    case "Delivered":
      return t("orders.statusDelivered", "Delivered");
    case "Cancelled":
      return t("orders.statusCancelled", "Cancelled");
    case "Rejected":
      return t("orders.statusRejected", "Rejected");
    default:
      return status;
  }
}
