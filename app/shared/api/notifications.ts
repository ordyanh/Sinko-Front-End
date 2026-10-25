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
