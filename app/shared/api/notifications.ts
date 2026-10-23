import { apiRequest } from "./http";

export type NotificationItemDto = {
  id: string;
  userId?: string;
  orderId?: string;
  orderNum?: string;
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

export type NotificationStatusKind = "rejected" | "confirmed" | "progress" | "pending" | "info";

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

export function getNotificationTheme(item: {
  status?: number | string;
  notificationType?: number;
  title?: string;
  message?: string;
}): NotificationTheme {
  const statusNum = typeof item.status === "number" ? item.status : parseInt(String(item.status || ""), 10);
  const typeNum = item.notificationType;
  const combinedText = `${item.title || ""} ${item.message || ""}`.toLowerCase();

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
    return {
      kind: "rejected",
      badgeLabel: combinedText.includes("cancel") || combinedText.includes("отменен") ? "Отменен" : "Отказ",
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
    const isDelivered = statusNum === 6 || combinedText.includes("deliver") || combinedText.includes("доставлен");
    return {
      kind: "confirmed",
      badgeLabel: isDelivered ? "Доставлен" : "Подтвержден",
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
    combinedText.includes("ճանապարհին")
  ) {
    const isShipped = statusNum === 5 || combinedText.includes("shipped") || combinedText.includes("в пути");
    return {
      kind: "progress",
      badgeLabel: isShipped ? "В пути" : "Готовится",
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
      badgeLabel: isOffer ? "Предложение" : "Новый заказ",
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
    badgeLabel: "Информация",
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

  const rawOrderId =
    raw.orderId ??
    raw.OrderId ??
    raw.relatedId ??
    raw.RelatedId ??
    raw.data?.orderId ??
    raw.data?.OrderId;

  let orderId = rawOrderId ? String(rawOrderId).trim() : undefined;
  const msg = String(raw.message ?? raw.Message ?? raw.detail ?? "");
  const title = String(raw.title ?? raw.Title ?? "");
  if (!orderId) {
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
    const friendlyMatch = msg.match(/#([A-Za-z]{3}-\d{10})/) || title.match(/#([A-Za-z]{3}-\d{10})/);
    if (friendlyMatch) {
      orderNum = friendlyMatch[1];
    } else if (orderId && /^[A-Za-z]{3}-\d{10}$/.test(orderId)) {
      orderNum = orderId;
    }
  }

  const statusNum =
    raw.status !== undefined && raw.status !== null
      ? Number(raw.status)
      : raw.Status !== undefined && raw.Status !== null
        ? Number(raw.Status)
        : undefined;

  const notifType =
    raw.notificationType !== undefined && raw.notificationType !== null
      ? Number(raw.notificationType)
      : raw.NotificationType !== undefined && raw.NotificationType !== null
        ? Number(raw.NotificationType)
        : undefined;

  return {
    id: String(raw.id ?? raw.Id ?? (orderId ? `${orderId}-${parsedDateIso}` : `notif-${Date.now()}`)),
    userId: raw.userId ?? raw.UserId ? String(raw.userId ?? raw.UserId) : undefined,
    orderId,
    orderNum,
    title: String(raw.title ?? raw.Title ?? ""),
    message: String(raw.message ?? raw.Message ?? raw.detail ?? ""),
    type: raw.type
      ? String(raw.type)
      : raw.notificationTypeName ?? raw.NotificationTypeName
        ? String(raw.notificationTypeName ?? raw.NotificationTypeName)
        : undefined,
    notificationType: notifType,
    notificationTypeName: raw.notificationTypeName ?? raw.NotificationTypeName ? String(raw.notificationTypeName ?? raw.NotificationTypeName) : undefined,
    status: statusNum,
    deepLink: raw.deepLink ?? raw.DeepLink ? String(raw.deepLink ?? raw.DeepLink) : (orderId ? `/orders/${orderId}` : undefined),
    isRead: Boolean(raw.isRead ?? raw.IsRead ?? raw.read),
    createdAt: parsedDateIso,
    creationDate: parsedDateIso,
    data: raw.data,
  };
}

export function formatNotificationTime(input?: string | number | Date | null): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
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
  return apiRequest<void>(`/api/Notifications/${id}/read`, {
    method: "POST",
  });
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
