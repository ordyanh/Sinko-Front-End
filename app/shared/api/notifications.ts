import { apiRequest } from "./http";

export type NotificationItemDto = {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
};

export type NotificationSettingsDto = {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  orderUpdates?: boolean;
  priceOffers?: boolean;
  promotions?: boolean;
};

export async function getNotifications(): Promise<NotificationItemDto[]> {
  try {
    const res = await apiRequest<NotificationItemDto[]>("/api/Notifications", {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
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
  try {
    await apiRequest<void>("/api/Notifications/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  } catch {
    await apiRequest<void>("/api/Notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }
}
