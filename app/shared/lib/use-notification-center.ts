import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  normalizeNotification,
  getNotificationTheme,
  type NotificationItemDto,
  type NotificationStatusKind,
} from "~/shared/api/notifications";
import { getClientAuthToken, getDecodedAuthToken } from "~/shared/lib/auth-token";
import type { DashboardAccountType } from "~/shared/ui/dashboard-layout";

export type ToastNotification = NotificationItemDto & {
  toastId: string;
  autoCloseMs?: number;
};

// Global BroadcastChannel for multi-tab and zero-latency local dispatch
const BROADCAST_CHANNEL_NAME = "synco_order_notifications";

export function broadcastOrderNotification(payload: {
  orderId?: string;
  orderNum?: string;
  title: string;
  message: string;
  status?: number | string;
  notificationType?: number;
  deepLink?: string;
  targetRole?: "horeca" | "supplier" | "all";
}) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({
      ...payload,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    });
    channel.close();
  } catch {
    // ignore
  }
}

// Synthesize pleasant, gentle audio chime using Web Audio API
export function playNotificationSound(kind: NotificationStatusKind = "info") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === "confirmed") {
      // Ascending triumphant chime (C5 -> E5 -> G5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.41);
    } else if (kind === "rejected") {
      // Subtle double alert for rejection (A4 -> F4)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.22);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.46);
    } else if (kind === "progress") {
      // Soft modern tone
      osc.type = "sine";
      osc.frequency.setValueAtTime(493.88, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else {
      // Gentle notification bell
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  } catch {
    // Audio restricted or not supported
  }
}

// Track IDs of toasts that have already been shown during this session to avoid repeats
const shownToastIds = new Set<string>();

export function useNotificationCenter(accountType: DashboardAccountType = "horeca") {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItemDto[]>([]);
  const [activeToasts, setActiveToasts] = useState<ToastNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to add toast and play sound
  const addToast = useCallback((item: NotificationItemDto) => {
    if (!item.id || shownToastIds.has(item.id)) return;
    shownToastIds.add(item.id);

    const theme = getNotificationTheme(item);
    playNotificationSound(theme.kind);

    const toast: ToastNotification = {
      ...item,
      toastId: item.id || `toast-${Date.now()}`,
      autoCloseMs: 9000,
    };

    setActiveToasts((prev) => [toast, ...prev.slice(0, 4)]);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  // Fetch from backend API
  const refreshNotifications = useCallback(async () => {
    try {
      const items = await getNotifications();
      if (Array.isArray(items)) {
        setNotifications(items);
        const unread = items.filter((n) => !n.isRead).length;
        setUnreadCount(unread);

        // Check if any fresh unread notification arrived recently (within last 3 minutes)
        // and hasn't been shown as toast yet
        const now = Date.now();
        items.forEach((item) => {
          if (!item.isRead) {
            const itemTime = new Date(item.createdAt || item.creationDate || "").getTime();
            if (!isNaN(itemTime) && now - itemTime < 180000) {
              addToast(item);
            }
          }
        });
      }
    } catch {
      // Backend might be warming up or offline
    }
  }, [addToast]);

  // Navigate directly to the order page
  const openOrder = useCallback(
    (orderId?: string, deepLink?: string, toastId?: string) => {
      if (toastId) {
        dismissToast(toastId);
      }

      if (deepLink) {
        let target = deepLink;
        // Adjust relative deep links to match role route if needed
        if (target.startsWith("/orders/") || target.startsWith("/promotions/")) {
          target = `/${accountType}${target}`;
        } else if (accountType === "supplier" && target.startsWith("/horeca/promotions/")) {
          target = target.replace("/horeca/promotions/", "/supplier/promotions");
        }
        navigate(target);
        return;
      }

      if (orderId) {
        const cleanId = orderId.trim();
        navigate(`/${accountType}/orders/${encodeURIComponent(cleanId)}`);
      }
    },
    [accountType, dismissToast, navigate],
  );

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch {
      // ignore
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  // 1. Initial fetch on mount (database history)
  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  // 2. BroadcastChannel for instant cross-tab & local notification sync
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      // Filter by target role if specified (matching horeca <-> client)
      const targetRole = String(data.targetRole || "").toLowerCase();
      const isClientRole = accountType === "horeca" || (accountType as string) === "client";
      const isSupplierRole = accountType === "supplier";

      if (targetRole && targetRole !== "all") {
        if (targetRole === "client" || targetRole === "horeca") {
          if (!isClientRole) return;
        } else if (targetRole === "supplier") {
          if (!isSupplierRole) return;
        } else if ((targetRole as string) !== (accountType as string)) {
          return;
        }
      }

      // Filter by target user IDs if specified
      if (Array.isArray(data.targetUserIds) && data.targetUserIds.length > 0) {
        const decoded = getDecodedAuthToken();
        const currentUserId = decoded?.sub || decoded?.nameid || decoded?.EmployeeId;
        if (currentUserId && !data.targetUserIds.includes(currentUserId)) {
          return;
        }
      }

      const payload = data.notification || data;
      const normalized = normalizeNotification(payload);
      setNotifications((prev) => [normalized, ...prev.filter((n) => n.id !== normalized.id)]);
      setUnreadCount((prev) => prev + 1);
      addToast(normalized);
    };

    return () => {
      channel.close();
    };
  }, [accountType, addToast]);

  const [isConnected, setIsConnected] = useState(false);

  // 3. Real-time WebSocket connection to /orderhub (Sinko.Notification)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isDisposed = false;
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    function connectWs() {
      if (isDisposed) return;

      const token = getClientAuthToken();
      if (!token) {
        // No token yet, retry later
        reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
        return;
      }

      // Determine WS protocol and host
      const isHttps = window.location.protocol === "https:";
      const wsProtocol = isHttps ? "wss:" : "ws:";
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/orderhub?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log("[NotificationCenter] Connected to WebSocket notification hub (/orderhub).");

          // Keep alive ping every 25 seconds
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "PING" }));
              } catch {
                // ignore
              }
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);

            // Ignore system / ping acks
            if (raw?.type === "CONNECTED" || raw?.type === "PONG") {
              return;
            }

            const normalized = normalizeNotification(raw);
            setNotifications((prev) => [normalized, ...prev.filter((n) => n.id !== normalized.id)]);
            setUnreadCount((prev) => prev + 1);
            addToast(normalized);

            // If notification is order-related, trigger order tables update
            if (raw.orderId || raw.OrderId || raw.type === "NEW_ORDER" || normalized.data?.orderId) {
              window.dispatchEvent(
                new CustomEvent("synco:orders-updated", {
                  detail: { orderId: raw.orderId || raw.OrderId },
                })
              );
            }
          } catch {
            // Non-JSON message or ping
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
          try {
            ws.close();
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
          socketRef.current = null;
          if (!isDisposed) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
          }
        };
      } catch {
        setIsConnected(false);
        if (!isDisposed) {
          reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
        }
      }
    }

    connectWs();

    return () => {
      isDisposed = true;
      setIsConnected(false);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [addToast]);

  return {
    notifications,
    unreadCount,
    activeToasts,
    isConnected,
    dismissToast,
    openOrder,
    markAsRead,
    markAllRead,
    refreshNotifications,
  };
}
