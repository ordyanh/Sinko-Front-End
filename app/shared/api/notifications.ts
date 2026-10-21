import { apiRequest } from "./http";

export type NotificationItemDto = {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  creationDate?: string;
  data?: Record<string, unknown>;
};

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

  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    message: String(raw.message ?? raw.detail ?? ""),
    type: raw.type ? String(raw.type) : undefined,
    isRead: Boolean(raw.isRead ?? raw.read),
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
