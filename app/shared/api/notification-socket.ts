import { getClientAuthToken } from "../lib/auth-token";
import {
  normalizeNotification,
  type NotificationItemDto,
} from "./notifications";

export const NOTIFICATION_RECEIVED_EVENT = "synko:notification-received";
export const ORDERS_UPDATED_EVENT = "synko:orders-updated";

/**
 * Resolves the WebSocket URL for Sinko.Notification (/orderhub).
 */
export function getNotificationSocketUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  // 1. Explicit env variable override if provided
  const envWsUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_NOTIFICATION_WS_URL as string | undefined)
      : undefined;

  if (envWsUrl) {
    const clean = envWsUrl.replace(/\/+$/, "");
    return clean.endsWith("/orderhub") ? clean : `${clean}/orderhub`;
  }

  // 2. Default: route through current host / reverse proxy (Vite dev or Express prod)
  // This completely prevents CORS, Mixed Content (HTTPS -> HTTP), and PNA blocks!
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/orderhub`;
}

export type SocketNotificationHandler = (notification: NotificationItemDto) => void;
export type SocketStatusHandler = (connected: boolean) => void;

class NotificationSocketManager {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 15000;
  private isExplicitlyClosed = false;
  private listeners = new Set<SocketNotificationHandler>();
  private statusListeners = new Set<SocketStatusHandler>();
  private lastToken: string | null = null;

  public isConnected = false;

  public subscribe(handler: SocketNotificationHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  public onStatusChange(handler: SocketStatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.isConnected);
    return () => this.statusListeners.delete(handler);
  }

  private notifyStatus(connected: boolean) {
    this.isConnected = connected;
    for (const listener of this.statusListeners) {
      try {
        listener(connected);
      } catch (err) {
        console.error("[NotificationSocket] Status listener error:", err);
      }
    }
  }

  public connect(customToken?: string) {
    if (typeof window === "undefined") return;

    const token = customToken || getClientAuthToken();
    if (!token) {
      console.warn("[NotificationSocket] No auth token found. Deferring WebSocket connection.");
      return;
    }

    // If already connected with the same token, do not reconnect
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) &&
      this.lastToken === token
    ) {
      return;
    }

    this.disconnect();
    this.isExplicitlyClosed = false;
    this.lastToken = token;

    const baseUrl = getNotificationSocketUrl();
    if (!baseUrl) return;

    const socketUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;

    try {
      console.log(`[NotificationSocket] Connecting to ${baseUrl}...`);
      const ws = new WebSocket(socketUrl);
      this.socket = ws;

      ws.onopen = () => {
        console.log("[NotificationSocket] WebSocket connection established successfully.");
        this.reconnectAttempts = 0;
        this.notifyStatus(true);
        this.startKeepAlive();
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);

          // Handle system / keepalive acks
          if (raw?.type === "CONNECTED") {
            console.log(`[NotificationSocket] User ${raw.userId} confirmed on socket.`);
            return;
          }

          if (raw?.type === "PONG") {
            return;
          }

          const notification = this.normalizeIncoming(raw);
          console.log("[NotificationSocket] Received real-time notification:", notification);

          // Notify internal listeners
          for (const listener of this.listeners) {
            try {
              listener(notification);
            } catch (err) {
              console.error("[NotificationSocket] Notification listener error:", err);
            }
          }

          // Dispatch browser global custom events
          window.dispatchEvent(
            new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail: notification })
          );

          // If related to an order, dispatch order update event so lists automatically refresh
          if (
            notification.data?.orderId ||
            raw.orderId ||
            raw.OrderId ||
            raw.type === "NEW_ORDER" ||
            raw.type?.toString().toLowerCase().includes("order")
          ) {
            window.dispatchEvent(
              new CustomEvent(ORDERS_UPDATED_EVENT, {
                detail: {
                  orderId: notification.data?.orderId || raw.orderId || raw.OrderId,
                  type: raw.type,
                },
              })
            );
          }
        } catch (parseError) {
          console.warn("[NotificationSocket] Non-JSON message received:", event.data);
        }
      };

      ws.onclose = (event) => {
        this.stopKeepAlive();
        this.notifyStatus(false);

        if (!this.isExplicitlyClosed) {
          console.warn(
            `[NotificationSocket] Socket closed (code: ${event.code}, reason: "${event.reason || "none"}"). Scheduling reconnect...`
          );
          this.scheduleReconnect();
        } else {
          console.log("[NotificationSocket] Socket closed explicitly.");
        }
      };

      ws.onerror = (error) => {
        console.error("[NotificationSocket] Socket error encountered:", error);
      };
    } catch (err) {
      console.error("[NotificationSocket] Failed to initiate WebSocket connection:", err);
      this.scheduleReconnect();
    }
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    // Send lightweight ping every 25 seconds to keep intermediary proxies alive
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "PING" }));
        } catch {
          // ignore
        }
      }
    }, 25000);
  }

  private stopKeepAlive() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;

    this.reconnectAttempts += 1;
    // Exponential backoff: 2s, 4s, 8s, up to 15s max
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`[NotificationSocket] Attempting reconnect in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopKeepAlive();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }

    this.notifyStatus(false);
  }

  private normalizeIncoming(raw: any): NotificationItemDto {
    const rawDate =
      raw.createdAt ??
      raw.CreatedAt ??
      raw.creationDate ??
      raw.CreationDate ??
      raw.timestamp ??
      raw.Timestamp;

    let parsedDateIso: string;
    if (rawDate) {
      const d = new Date(rawDate);
      parsedDateIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    } else {
      parsedDateIso = new Date().toISOString();
    }

    const orderId = raw.orderId ?? raw.OrderId ?? null;
    const orderNum = raw.orderNum ?? raw.OrderNum ?? null;
    const deepLink =
      raw.deepLink ??
      raw.DeepLink ??
      (orderId ? `/orders/${orderId}` : undefined);

    const title =
      raw.title ??
      raw.Title ??
      (raw.type === "NEW_ORDER" ? "Новый заказ" : "Уведомление");

    const message =
      raw.message ??
      raw.Message ??
      raw.detail ??
      raw.Detail ??
      (orderNum ? `Заказ #${orderNum}` : "У вас новое обновление в системе");

    const id = String(
      raw.id ??
      raw.Id ??
      raw.notificationId ??
      `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    );

    return {
      id,
      title,
      message,
      type: raw.type ? String(raw.type) : (raw.notificationType ? String(raw.notificationType) : undefined),
      isRead: false,
      createdAt: parsedDateIso,
      creationDate: parsedDateIso,
      data: {
        orderId,
        orderNum,
        deepLink,
        status: raw.status ?? raw.Status,
        clientId: raw.clientId ?? raw.ClientId,
        targetUserId: raw.targetUserId ?? raw.TargetUserId,
        ...raw.data,
      },
    };
  }
}

export const notificationSocket = new NotificationSocketManager();
