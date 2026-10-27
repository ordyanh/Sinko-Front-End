import { apiRequest } from "./http";

export type NotificationItemDto = {
  id: string;
  userId?: string;
  orderId?: string;
  orderNum?: string;
  relatedId?: string;
  promotionId?: string;
  title: string;
  message: string;
  type?: string;
  notificationType?: number;
  notificationTypeName?: string;
  status?: number;
  deepLink?: string;
  isRead: boolean;
  createdAt: string;
  creationDate?: string;
  data?: Record<string, unknown>;
};

export type NotificationStatusKind = "rejected" | "confirmed" | "progress" | "pending" | "promotion" | "info";

export type NotificationTheme = {
  kind: NotificationStatusKind;
  badgeLabel: string;
  badgeClass: string;
  borderClass: string;
  barClass: string;
  bgClass: string;
  textClass: string;
  iconBg: string;
  actionButtonClass: string;
};

export function getNotificationTheme(
  item: {
    status?: number | string;
    notificationType?: number;
    title?: string;
    message?: string;
    relatedId?: string;
    promotionId?: string;
  },
  t?: (key: string, fallback?: string) => string,
): NotificationTheme {
  const statusNum = typeof item.status === "number" ? item.status : parseInt(String(item.status || ""), 10);
  const typeNum = item.notificationType;
  const combinedText = `${item.title || ""} ${item.message || ""}`.toLowerCase();
  const tr = (key: string, fallback: string) => (t ? t(key, fallback) : fallback);

  // 0. Promotions (Vibrant Purple / Fuchsia / Pink Gradient with Special Badge & Button!)
  if (
    typeNum === 50 || // NotificationType.Promotion
    combinedText.includes("promotion") ||
    combinedText.includes("промо") ||
    combinedText.includes("акция") ||
    combinedText.includes("ակցիա") ||
    combinedText.includes("զեղչ") ||
    item.relatedId?.toLowerCase().startsWith("promo-") ||
    item.promotionId
  ) {
    return {
      kind: "promotion",
      badgeLabel: tr("notifications.statusPromotion", "Промо-акция"),
      badgeClass: "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-extrabold shadow-sm border-transparent",
      borderClass: "border-purple-300/90 bg-gradient-to-br from-purple-50/90 via-fuchsia-50/40 to-white shadow-purple-100",
      barClass: "bg-gradient-to-b from-purple-600 via-fuchsia-500 to-pink-500",
      bgClass: "bg-gradient-to-r from-purple-50/80 to-fuchsia-50/50",
      textClass: "text-purple-900",
      iconBg: "bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 text-white shadow-md shadow-purple-200",
      actionButtonClass: "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md shadow-purple-200 font-bold",
    };
  }

  // 1. Rejected / Cancelled (Red)
  if (
    statusNum === 7 ||
    typeNum === 5 || // SupplierOfferRejected
    combinedText.includes("reject") ||
    combinedText.includes("cancel") ||
    combinedText.includes("отказ") ||
    combinedText.includes("отменен") ||
    combinedText.includes("մերժված") ||
    combinedText.includes("չեղարկված")
  ) {
    const isCancelled = combinedText.includes("cancel") || combinedText.includes("отменен") || combinedText.includes("չեղարկված");
    return {
      kind: "rejected",
      badgeLabel: isCancelled
        ? tr("notifications.statusCancelled", "Отменен")
        : tr("notifications.statusRejected", "Отказ"),
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
      borderClass: "border-rose-400/80 shadow-rose-100",
      barClass: "bg-rose-500",
      bgClass: "bg-rose-50/50",
      textClass: "text-rose-700",
      iconBg: "bg-rose-100 text-rose-600",
      actionButtonClass: "bg-rose-600 hover:bg-rose-700 text-white",
    };
  }

  // 2. Confirmed / Accepted / Delivered / Finished (Green)
  if (
    statusNum === 3 ||
    statusNum === 6 ||
    statusNum === 9 ||
    statusNum === 10 ||
    typeNum === 4 || // SupplierOfferAccepted
    typeNum === 24 || // ClientOfferAccepted
    combinedText.includes("accept") ||
    combinedText.includes("confirm") ||
    combinedText.includes("deliver") ||
    combinedText.includes("подтвержден") ||
    combinedText.includes("принят") ||
    combinedText.includes("доставлен") ||
    combinedText.includes("հաստատված") ||
    combinedText.includes("ընդունված")
  ) {
    const isDelivered = statusNum === 6 || combinedText.includes("deliver") || combinedText.includes("доставлен") || combinedText.includes("առաքված");
    return {
      kind: "confirmed",
      badgeLabel: isDelivered
        ? tr("notifications.statusDelivered", "Доставлен")
        : tr("notifications.statusConfirmed", "Подтвержден"),
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      borderClass: "border-emerald-400/80 shadow-emerald-100",
      barClass: "bg-emerald-500",
      bgClass: "bg-emerald-50/50",
      textClass: "text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-600",
      actionButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    };
  }

  // 3. In Progress / Preparing / Shipped (Blue / Indigo)
  if (
    statusNum === 4 ||
    statusNum === 5 ||
    combinedText.includes("in progress") ||
    combinedText.includes("preparing") ||
    combinedText.includes("shipped") ||
    combinedText.includes("ready for delivery") ||
    combinedText.includes("в пути") ||
    combinedText.includes("готов") ||
    combinedText.includes("пакуется") ||
    combinedText.includes("ճանապարհին") ||
    combinedText.includes("պատրաստվում")
  ) {
    const isShipped = statusNum === 5 || combinedText.includes("shipped") || combinedText.includes("в пути") || combinedText.includes("ճանապարհին");
    return {
      kind: "progress",
      badgeLabel: isShipped
        ? tr("notifications.statusShipped", "В пути")
        : tr("notifications.statusInProgress", "В обработке"),
      badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
      borderClass: "border-sky-400/80 shadow-sky-100",
      barClass: "bg-sky-500",
      bgClass: "bg-sky-50/50",
      textClass: "text-sky-700",
      iconBg: "bg-sky-100 text-sky-600",
      actionButtonClass: "bg-sky-600 hover:bg-sky-700 text-white",
    };
  }

  // 4. New Order / Price Offer / Waiting Confirmation (Amber)
  if (
    statusNum === 1 ||
    statusNum === 8 ||
    typeNum === 1 || // SupplierNewOrder
    typeNum === 20 || // ClientOrderSubmitted
    typeNum === 21 || // ClientPriceOfferReceived
    combinedText.includes("new order") ||
    combinedText.includes("новый заказ") ||
    combinedText.includes("price offer") ||
    combinedText.includes("offer") ||
    combinedText.includes("предложение") ||
    combinedText.includes("առաջարկ") ||
    combinedText.includes("նոր պատվեր")
  ) {
    const isOffer = statusNum === 8 || typeNum === 21 || combinedText.includes("offer") || combinedText.includes("предложение");
    return {
      kind: "pending",
      badgeLabel: isOffer
        ? tr("notifications.priceOfferTitle", "Предложение")
        : tr("notifications.statusNewOrder", "Новый заказ"),
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      borderClass: "border-amber-400/80 shadow-amber-100",
      barClass: "bg-amber-500",
      bgClass: "bg-amber-50/50",
      textClass: "text-amber-800",
      iconBg: "bg-amber-100 text-amber-700",
      actionButtonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    };
  }

  // 5. Default
  return {
    kind: "info",
    badgeLabel: tr("notifications.statusUpdate", "Информация"),
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    borderClass: "border-slate-300",
    barClass: "bg-slate-400",
    bgClass: "bg-slate-50",
    textClass: "text-slate-700",
    iconBg: "bg-slate-100 text-slate-600",
    actionButtonClass: "bg-slate-800 hover:bg-slate-900 text-white",
  };
}

export type NotificationSettingsDto = {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  orderUpdates?: boolean;
  priceOffers?: boolean;
  promotions?: boolean;
};

export function isGuid(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export function sanitizeOrderText(text: string, orderNum?: string | null, orderId?: string | null): string {
  if (!text) return "";
  let result = text;
  const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

  if (orderNum) {
    if (orderId && isGuid(orderId)) {
      result = result.split(orderId).join(orderNum);
    }
    result = result.replace(guidRegex, orderNum);
  } else {
    // If orderNum is not available, remove raw GUIDs so raw hashes are never shown
    result = result.replace(/#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi, "");
    result = result.replace(guidRegex, "");
  }

  // Clean up any double spaces or dangling "#." or "# "
  result = result.replace(/#\s+/g, "#").replace(/#\./g, ".").replace(/\s{2,}/g, " ").trim();
  return result;
}

export function localizeNotification(
  rawTitle: string | undefined | null,
  rawMessage: string | undefined | null,
  orderNum?: string | null,
  orderId?: string | null,
  t?: (key: string, fallback?: any) => string,
): { title: string; message: string } {
  let title = sanitizeOrderText(rawTitle || "", orderNum, orderId);
  let message = sanitizeOrderText(rawMessage || "", orderNum, orderId);

  if (!t) return { title, message };

  const tr = (key: string, fallback: string): string => {
    try {
      const res = t(key, fallback);
      return typeof res === "string" && res.trim().length > 0 ? res : fallback;
    } catch {
      return fallback;
    }
  };

  const effectiveOrderNum = orderNum || (orderId && !isGuid(orderId) ? orderId : "");

  // 1. Promotions
  // Title: "Новая промо-акция: {name}" or "New promotion: {name}" or "Նոր ակցիա. {name}"
  const promoTitleMatch = title.match(/^(?:Новая промо-акция|New promotion|Նոր ակցիա)[:\.\s]+(.+)$/i);
  if (promoTitleMatch) {
    const promoName = promoTitleMatch[1].trim();
    title = tr("notifications.newPromotionNotificationTitle", "New promotion: {name}").replace("{name}", promoName);
  } else if (/^(?:Новая промо-акция|New promotion|Նոր ակցիա)$/i.test(title.trim())) {
    title = tr("notifications.newPromotionTitle", "New promotion");
  }

  // Message: "Поставщик «{supplier}» запустил акцию «{name}». Откройте, чтобы посмотреть подробности!"
  const promoMsgMatch1 = message.match(
    /^(?:Поставщик\s+)?[«"]?([^«»"“”]+?)[»"]?\s+запустил акцию\s+[«"]?([^«»"“”]+?)[»"]?\.?\s*(?:Откройте[^\.!]*[\.!])?/i,
  );
  const promoMsgMatch2 = message.match(
    /^(?:Supplier\s+)?[«"]?([^«»"“”]+?)[»"]?\s+launched\s+(?:«|")?([^«»"“”]+?)(?:»|")?\s+promotion\.?\s*(?:Open[^\.!]*[\.!])?/i,
  );
  const promoMsgMatch3 = message.match(
    /^[«"]?([^«»"“”]+?)[»"]?\s+մատակարարը գործարկել է\s+[«"]?([^«»"“”]+?)[»"]?\s+ակցիան\.?\s*(?:Բացեք[^\.!]*[\.!])?/i,
  );

  const promoMatch = promoMsgMatch1 || promoMsgMatch2 || promoMsgMatch3;
  if (promoMatch) {
    const supplier = promoMatch[1].trim();
    const name = promoMatch[2].trim();
    message = tr(
      "notifications.newPromotionNotificationDesc",
      'Supplier "{supplier}" launched "{name}" promotion. Open to see details!',
    )
      .replace("{supplier}", supplier)
      .replace("{name}", name);
  }

  // 2. Order Accepted
  // Title: "Order Accepted" / "Заказ принят" / "Պատվերն ընդունված է"
  if (/^(?:Order Accepted|Заказ принят|Պատվերն ընդունված է)$/i.test(title.trim())) {
    title = tr("notifications.orderAcceptedTitle", "Order Accepted");
  }

  // Message: "Supplier {supplier} has accepted your order #{orderNum}."
  // or "Поставщик «{supplier}» принял ваш заказ #{orderNum}."
  // or "{supplier} մատակարարն ընդունել է Ձեր #{orderNum} պատվերը:"
  const orderAcceptedMatch =
    message.match(/^Supplier\s+(.+?)\s+has accepted your order\s*#?([A-Za-z0-9-]+)?\.?$/i) ||
    message.match(/^Поставщик\s+[«"]?(.+?)[»"]?\s+принял ваш заказ\s*#?([A-Za-z0-9-]+)?\.?$/i) ||
    message.match(/^«?(.+?)»?\s+մատակարարն ընդունել է Ձեր\s*#?([A-Za-z0-9-]+)?\s*պատվերը[:\.]?$/i);
  if (orderAcceptedMatch) {
    const supplier = orderAcceptedMatch[1].trim();
    const num = orderAcceptedMatch[2] || effectiveOrderNum;
    message = tr("notifications.orderAcceptedDesc", "Supplier {supplier} has accepted your order #{orderNum}.")
      .replace("{supplier}", supplier)
      .replace("{orderNum}", num);
  }

  // 3. Order Cancelled
  if (/^(?:Order Cancelled|Заказ отменен|Պատվերը չեղարկվել է)$/i.test(title.trim())) {
    title = tr("notifications.orderCancelledTitle", "Order Cancelled");
  }

  const orderCancelledByMatch =
    message.match(/^Order\s+#?([A-Za-z0-9-]+)?\s+(?:was|has been)\s+cancelled\s+by\s+(.+?)\.?$/i) ||
    message.match(/^Заказ\s+#?([A-Za-z0-9-]+)?\s+(?:был\s+)?отменен\s+(?:клиентом|поставщиком)\s+(.+?)\.?$/i) ||
    message.match(/^#?([A-Za-z0-9-]+)?\s+պատվերը չեղարկվել է\s+(.+?)-ի կողմից[:\.]?$/i);
  if (orderCancelledByMatch) {
    const num = orderCancelledByMatch[1] || effectiveOrderNum;
    const by = orderCancelledByMatch[2].trim();
    message = tr("notifications.orderCancelledByDesc", "Order #{orderNum} was cancelled by {client}.")
      .replace("{orderNum}", num)
      .replace("{client}", by);
  } else if (
    /^Order\s+#?([A-Za-z0-9-]+)?\s+(?:was|has been|is)\s+cancelled\.?$/i.test(message) ||
    /^Заказ\s+#?([A-Za-z0-9-]+)?\s+(?:был\s+)?отменен\.?$/i.test(message)
  ) {
    const match = message.match(/^Order\s+#?([A-Za-z0-9-]+)?/i) || message.match(/^Заказ\s+#?([A-Za-z0-9-]+)?/i);
    const num = match?.[1] || effectiveOrderNum;
    message = tr("notifications.orderCancelledDesc", "Order #{orderNum} is cancelled.").replace("{orderNum}", num);
  }

  // 4. Order Approved
  if (/^(?:Order Approved|Заказ одобрен|Պատվերը հաստատված է)$/i.test(title.trim())) {
    title = tr("notifications.orderApprovedTitle", "Order Approved");
  }
  const orderApprovedMatch =
    message.match(/^Order\s+#?([A-Za-z0-9-]+)?\s+(?:was|has been)\s+approved\s+by\s+(.+?)\.?$/i) ||
    message.match(/^Заказ\s+#?([A-Za-z0-9-]+)?\s+(?:был\s+)?одобрен\s+(?:клиентом\s+)?(.+?)\.?$/i) ||
    message.match(/^#?([A-Za-z0-9-]+)?\s+պատվերը հաստատվել է\s+(.+?)-ի կողմից[:\.]?$/i);
  if (orderApprovedMatch) {
    const num = orderApprovedMatch[1] || effectiveOrderNum;
    const by = orderApprovedMatch[2].trim();
    message = tr("notifications.orderApprovedDesc", "Order #{orderNum} was approved by {client}.")
      .replace("{orderNum}", num)
      .replace("{client}", by);
  }

  // 5. Order Claimed
  if (/^(?:Order Claimed|Заказ принят сотрудником|Պատվերը վերցված է աշխատանքի)$/i.test(title.trim())) {
    title = tr("notifications.orderClaimedTitle", "Order Claimed");
  }
  const orderClaimedMatch =
    message.match(/^Order\s+#?([A-Za-z0-9-]+)?\s+has been claimed by\s+(.+?)\.?$/i) ||
    message.match(/^Заказ\s+#?([A-Za-z0-9-]+)?\s+(?:был\s+)?взят в\s+(?:обработку|работу)\s+сотрудником\s+(.+?)\.?$/i) ||
    message.match(/^#?([A-Za-z0-9-]+)?\s+պատվերը վերցվել է աշխատանքի\s+(.+?)-ի կողմից[:\.]?$/i);
  if (orderClaimedMatch) {
    const num = orderClaimedMatch[1] || effectiveOrderNum;
    const by = orderClaimedMatch[2].trim();
    message = tr("notifications.orderClaimedDesc", "Order #{orderNum} has been claimed by {employee}.")
      .replace("{orderNum}", num)
      .replace("{employee}", by);
  }

  // 6. Price Offers & Adjustments
  if (/^(?:New Price Offer Received|Получено новое ценовое предложение|Ստացվել է նոր գնային առաջարկ)$/i.test(title.trim())) {
    title = tr("notifications.newPriceOfferTitle", "New Price Offer Received");
  } else if (/^(?:Price Offer Received|Получено ценовое предложение|Ստացվել է գնային առաջարկ)$/i.test(title.trim())) {
    title = tr("notifications.priceOfferReceivedTitle", "Price Offer Received");
  } else if (/^(?:Price and Quantity Offer Updated|Обновлено предложение по цене и количеству|Գնի և քանակի առաջարկը թարմացվել է)$/i.test(title.trim())) {
    title = tr("notifications.priceAndQuantityOfferTitle", "Price and Quantity Offer Updated");
  } else if (/^(?:Quantity Adjustment Offer|Предложение по изменению количества|Ապրանքների քանակի փոփոխության առաջարկ)$/i.test(title.trim())) {
    title = tr("notifications.quantityAdjustmentOfferTitle", "Quantity Adjustment Offer");
  } else if (/^(?:New Price Request|Новый ценовой запрос|Նոր գնային հարցում)$/i.test(title.trim())) {
    title = tr("notifications.newPriceRequestTitle", "New Price Request");
  } else if (/^(?:Price Offer|Предложение цены по заказу|Գնային առաջարկ պատվերի համար)$/i.test(title.trim())) {
    title = tr("notifications.priceOfferTitle", "Price offer for order");
  }

  const priceOfferMatch = message.match(/^Supplier\s+(.+?)\s+sent (?:you a price offer|new prices) for order\s*#?([A-Za-z0-9-]+)?\.?$/i);
  if (priceOfferMatch) {
    const num = priceOfferMatch[2] || effectiveOrderNum;
    message = tr("notifications.priceOfferDesc", "Supplier sent new prices for order #{orderNum}.").replace("{orderNum}", num);
  }

  const priceQtyMatch = message.match(/^Supplier\s+(.+?)\s+updated prices and quantities for order\s*#?([A-Za-z0-9-]+)?\.?$/i);
  if (priceQtyMatch) {
    const supplier = priceQtyMatch[1].trim();
    const num = priceQtyMatch[2] || effectiveOrderNum;
    message = tr("notifications.priceAndQuantityOfferDesc", "Supplier {supplier} updated prices and quantities for order #{orderNum}.")
      .replace("{supplier}", supplier)
      .replace("{orderNum}", num);
  }

  const qtyAdjMatch = message.match(/^Supplier\s+(.+?)\s+adjusted item quantities for order\s*#?([A-Za-z0-9-]+)?\.?$/i);
  if (qtyAdjMatch) {
    const supplier = qtyAdjMatch[1].trim();
    const num = qtyAdjMatch[2] || effectiveOrderNum;
    message = tr("notifications.quantityAdjustmentOfferDesc", "Supplier {supplier} adjusted item quantities for order #{orderNum}.")
      .replace("{supplier}", supplier)
      .replace("{orderNum}", num);
  }

  const newPriceReqMatch = message.match(/^New price offer request from\s+(.+?)\s+for order\s*#?([A-Za-z0-9-]+)?\.?$/i);
  if (newPriceReqMatch) {
    const rest = newPriceReqMatch[1].trim();
    const num = newPriceReqMatch[2] || effectiveOrderNum;
    message = tr("notifications.newPriceRequestDesc", "New price offer request from {restaurant} for order #{orderNum}.")
      .replace("{restaurant}", rest)
      .replace("{orderNum}", num);
  }

  // 7. Offer Accepted / Rejected
  if (/^(?:Offer Accepted|Предложение принято|Առաջարկն ընդունվել է)$/i.test(title.trim())) {
    title = tr("notifications.offerAcceptedTitle", "Offer Accepted");
  } else if (/^(?:Offer Rejected|Предложение отклонено|Առաջարկը մերժվել է)$/i.test(title.trim())) {
    title = tr("notifications.offerRejectedTitle", "Offer Rejected");
  }

  const offerAccMatch = message.match(/^(?:Restaurant|Client\s+(.+?))\s+accepted\s+(?:the|your price)\s+offer for order\s*#?([A-Za-z0-9-]+)?\.?$/i);
  if (offerAccMatch) {
    const client = offerAccMatch[1]?.trim() || tr("common.customer", "Client");
    const num = offerAccMatch[2] || effectiveOrderNum;
    message = tr("notifications.offerAcceptedDesc", "Client {client} accepted the offer for order #{orderNum}.")
      .replace("{client}", client)
      .replace("{orderNum}", num);
  }

  const offerRejMatch = message.match(/^(?:Restaurant|Client\s+(.+?))\s+rejected\s+(?:the|your price)\s+offer for order\s*#?([A-Za-z0-9-]+)?\.?$/i);
  if (offerRejMatch) {
    const client = offerRejMatch[1]?.trim() || tr("common.customer", "Client");
    const num = offerRejMatch[2] || effectiveOrderNum;
    message = tr("notifications.offerRejectedDesc", "Client {client} rejected the offer for order #{orderNum}.")
      .replace("{client}", client)
      .replace("{orderNum}", num);
  }

  // 8. New Order from Client / Restaurant
  const newOrderTitleMatch = title.match(/^New order received from\s+(.+?)\.?$/i);
  if (newOrderTitleMatch) {
    title = tr("notifications.newOrderFromRestaurantTitle", "New order from client");
  } else if (/^New order received$/i.test(title.trim())) {
    title = tr("notifications.statusNewOrder", "New order");
  }

  const newOrderMsgMatch = message.match(/^New order\s*#?([A-Za-z0-9-]+)?\s+received from\s+(.+?)\.?$/i);
  if (newOrderMsgMatch) {
    const num = newOrderMsgMatch[1] || effectiveOrderNum;
    const client = newOrderMsgMatch[2].trim();
    message = tr("notifications.newOrderFromRestaurantDesc", "{companyName} placed a new order #{orderNum}.")
      .replace("{companyName}", client)
      .replace("{orderNum}", num);
  }

  const orderAssignedMatch = message.match(/^Order\s*#?([A-Za-z0-9-]+)?\s+has been assigned to you\.?$/i);
  if (orderAssignedMatch) {
    const num = orderAssignedMatch[1] || effectiveOrderNum;
    message = tr("notifications.orderAssignedDesc", "Order #{orderNum} has been assigned to you.").replace("{orderNum}", num);
  }

  const orderAvailMatch = message.match(/^New order received from\s+(.+?)\.\s*Order\s*#?([A-Za-z0-9-]+)?\s+is available for acceptance\.?$/i);
  if (orderAvailMatch) {
    const client = orderAvailMatch[1].trim();
    const num = orderAvailMatch[2] || effectiveOrderNum;
    message = tr("notifications.orderAvailableDesc", "New order received from {client}. Order #{orderNum} is available for acceptance.")
      .replace("{client}", client)
      .replace("{orderNum}", num);
  }

  // 9. Order Status Update
  const statusUpdateTitleMatch = title.match(/^Order\s+#?([A-Za-z0-9-]+)?\s+Status Update$/i);
  if (statusUpdateTitleMatch) {
    const num = statusUpdateTitleMatch[1] || effectiveOrderNum;
    title = tr("notifications.orderStatusUpdateTitle", "Order #{orderNum} Status Update").replace("{orderNum}", num);
  }

  const statusUpdateMsgMatch = message.match(/^Status of your order\s*#?([A-Za-z0-9-]+)?\s+changed to:\s*(.+?)\.?$/i);
  if (statusUpdateMsgMatch) {
    const num = statusUpdateMsgMatch[1] || effectiveOrderNum;
    const rawStatus = statusUpdateMsgMatch[2].trim();
    const statusLower = rawStatus.toLowerCase();
    let localizedStatus = rawStatus;

    if (statusLower.includes("accept") || statusLower.includes("confirm")) {
      localizedStatus = tr("notifications.statusConfirmed", "Confirmed");
    } else if (statusLower.includes("prepar") || statusLower.includes("progress")) {
      localizedStatus = tr("notifications.statusInProgress", "In progress");
    } else if (statusLower.includes("ship")) {
      localizedStatus = tr("notifications.statusShipped", "Shipped");
    } else if (statusLower.includes("deliver")) {
      localizedStatus = tr("notifications.statusDelivered", "Delivered");
    } else if (statusLower.includes("reject")) {
      localizedStatus = tr("notifications.statusRejected", "Rejected");
    } else if (statusLower.includes("cancel")) {
      localizedStatus = tr("notifications.statusCancelled", "Cancelled");
    } else if (statusLower.includes("waiting") || statusLower.includes("offer")) {
      localizedStatus = tr("notifications.priceOfferTitle", "Price offer");
    }

    message = tr("notifications.orderStatusUpdateDesc", "Status of your order #{orderNum} changed to: {status}.")
      .replace("{orderNum}", num)
      .replace("{status}", localizedStatus);
  }

  // 10. Fallback titles
  if (/^Order confirmed by supplier$/i.test(title.trim())) {
    title = tr("notifications.orderConfirmedTitle", "Order confirmed by supplier");
  } else if (/^Order is being prepared$/i.test(title.trim())) {
    title = tr("notifications.orderPreparingTitle", "Order is being prepared");
  } else if (/^Order is on the way$/i.test(title.trim())) {
    title = tr("notifications.orderShippedTitle", "Order is on the way");
  } else if (/^Order delivered$/i.test(title.trim())) {
    title = tr("notifications.orderDeliveredTitle", "Order delivered");
  } else if (/^Order rejected$/i.test(title.trim())) {
    title = tr("notifications.orderRejectedTitle", "Order rejected");
  }

  return { title, message };
}

export function normalizeNotification(raw: any): NotificationItemDto {
  if (!raw || typeof raw !== "object") {
    const nowIso = new Date().toISOString();
    return {
      id: "",
      title: "",
      message: "",
      isRead: false,
      createdAt: nowIso,
      creationDate: nowIso,
    };
  }

  const rawDate =
    raw.createdAt ??
    raw.CreatedAt ??
    raw.creationDate ??
    raw.CreationDate ??
    raw.date ??
    raw.timestamp;

  let parsedDateIso: string;
  if (rawDate) {
    const d = new Date(rawDate);
    parsedDateIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
  } else {
    parsedDateIso = new Date().toISOString();
  }

  const notifType =
    raw.notificationType !== undefined && raw.notificationType !== null
      ? Number(raw.notificationType)
      : raw.NotificationType !== undefined && raw.NotificationType !== null
        ? Number(raw.NotificationType)
        : undefined;

  const rawRelatedId = raw.relatedId ?? raw.RelatedId;
  const msg = String(raw.message ?? raw.Message ?? raw.detail ?? "");
  const title = String(raw.title ?? raw.Title ?? "");
  const combinedText = `${title} ${msg}`.toLowerCase();

  const isPromoType =
    notifType === 50 ||
    String(raw.type || "").toLowerCase().includes("promo") ||
    combinedText.includes("промо") ||
    combinedText.includes("ակցիա") ||
    combinedText.includes("promotion") ||
    (typeof rawRelatedId === "string" && rawRelatedId.toLowerCase().startsWith("promo-")) ||
    Boolean(raw.promotionId || raw.PromotionId || raw.data?.promotionId || raw.data?.PromotionId);

  const rawOrderId =
    raw.orderId ??
    raw.OrderId ??
    (!isPromoType ? rawRelatedId : undefined) ??
    raw.data?.orderId ??
    raw.data?.OrderId;

  let orderId = rawOrderId ? String(rawOrderId).trim() : undefined;
  if (!isPromoType && !orderId) {
    const match = msg.match(/#([a-zA-Z0-9-]+)/) || title.match(/#([a-zA-Z0-9-]+)/);
    if (match) {
      orderId = match[1];
    }
  }

  const rawOrderNum =
    raw.orderNum ??
    raw.OrderNum ??
    raw.data?.orderNum ??
    raw.data?.OrderNum;

  let orderNum = rawOrderNum ? String(rawOrderNum).trim() : undefined;
  if (!orderNum) {
    const friendlyMatch = msg.match(/#?([A-Za-z]{3}-\d{10})/i) || title.match(/#?([A-Za-z]{3}-\d{10})/i);
    if (friendlyMatch) {
      orderNum = friendlyMatch[1].toUpperCase();
    } else if (orderId && /^[A-Za-z]{3}-\d{10}$/i.test(orderId)) {
      orderNum = orderId.toUpperCase();
    }
  }

  const promoId = isPromoType
    ? String(rawRelatedId || raw.promotionId || raw.PromotionId || raw.data?.promotionId || raw.data?.PromotionId || "").trim() || undefined
    : undefined;

  const statusNum =
    raw.status !== undefined && raw.status !== null
      ? Number(raw.status)
      : raw.Status !== undefined && raw.Status !== null
        ? Number(raw.Status)
        : undefined;

  let deepLink = raw.deepLink ?? raw.DeepLink;
  if (!deepLink) {
    if (isPromoType) {
      deepLink = promoId ? `/horeca/promotions/${promoId}` : `/horeca/promotions`;
    } else if (orderId) {
      deepLink = `/orders/${orderId}`;
    }
  }

  const cleanTitle = sanitizeOrderText(title, orderNum, orderId);
  const cleanMsg = sanitizeOrderText(msg, orderNum, orderId);

  const rawId = raw.id ?? raw.Id ?? raw.notificationId ?? raw.NotificationId;
  const resolvedId = String(rawId || promoId || orderId || `notif-${Date.now()}`);

  return {
    id: resolvedId,
    userId: raw.userId ?? raw.UserId ? String(raw.userId ?? raw.UserId) : undefined,
    orderId,
    orderNum,
    relatedId: rawRelatedId ? String(rawRelatedId) : undefined,
    promotionId: promoId,
    title: cleanTitle,
    message: cleanMsg,
    type: raw.type
      ? String(raw.type)
      : raw.notificationTypeName ?? raw.NotificationTypeName
        ? String(raw.notificationTypeName ?? raw.NotificationTypeName)
        : undefined,
    notificationType: notifType,
    notificationTypeName: raw.notificationTypeName ?? raw.NotificationTypeName ? String(raw.notificationTypeName ?? raw.NotificationTypeName) : undefined,
    status: statusNum,
    deepLink,
    isRead: Boolean(raw.isRead ?? raw.IsRead ?? raw.read),
    createdAt: parsedDateIso,
    creationDate: parsedDateIso,
    data: {
      ...raw.data,
      orderId,
      orderNum,
    },
  };
  }

export function formatNotificationTime(
  input?: string | number | Date | null,
  t?: (key: string, fallback?: string) => string,
): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec >= 0 && diffSec < 45) {
    return t ? t("notifications.justNow", "Just now") : "Just now";
  }

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export async function getNotifications(): Promise<NotificationItemDto[]> {
  try {
    const res = await apiRequest<any[]>("/api/Notifications", {
      method: "GET",
    });
    if (!Array.isArray(res)) return [];
    return res.map(normalizeNotification);
  } catch {
    return [];
  }
}

export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const res = await apiRequest<{ count?: number } | number>("/api/Notifications/unread-count", {
      method: "GET",
    });
    if (typeof res === "number") return res;
    return res?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!id) return;
  // If this is a purely local client-side notification that was never stored on the server
  if (id.startsWith("notif-client-") || id.startsWith("client-")) {
    return;
  }

  // Extract clean GUID if composite ID or timestamp suffix was passed
  const guidMatch = id.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const targetId = guidMatch ? guidMatch[0] : id.trim();

  try {
    await apiRequest<void>(`/api/Notifications/${encodeURIComponent(targetId)}/read`, {
      method: "POST",
    });
  } catch (err) {
    // Gracefully handle 404/network errors so user navigation or UI dismissal never fails
    console.debug(`[markNotificationRead] Notification ${targetId} could not be marked on server:`, err);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>("/api/Notifications/read-all", {
    method: "POST",
  });
}

export async function getNotificationSettings(): Promise<NotificationSettingsDto> {
  try {
    return await apiRequest<NotificationSettingsDto>("/api/Notifications/settings", {
      method: "GET",
    });
  } catch {
    return {
      emailNotifications: true,
      smsNotifications: true,
      orderUpdates: true,
      priceOffers: true,
      promotions: true,
    };
  }
}

export async function updateNotificationSettings(
  settings: NotificationSettingsDto,
): Promise<void> {
  const body = {
    ...settings,
    settings: [],
  };
  try {
    await apiRequest<void>("/api/Notifications/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch {
    await apiRequest<void>("/api/Notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}
