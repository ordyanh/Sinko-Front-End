import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  Megaphone,
  ShoppingBag,
  Truck,
  Bell,
  type LucideIcon,
} from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  formatNotificationTime,
  type NotificationItemDto,
} from "~/shared/api/notifications";
import {
  notificationSocket,
  NOTIFICATION_RECEIVED_EVENT,
} from "~/shared/api/notification-socket";
import type { DashboardNotification } from "~/shared/ui/notification-drawer";
import { useToast } from "~/shared/ui/toast";
import { getClientAuthToken } from "~/shared/lib/auth-token";

export type NotificationContextValue = {
  notifications: DashboardNotification[];
  rawNotifications: NotificationItemDto[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function mapDtoToDashboardNotification(n: NotificationItemDto): DashboardNotification {
  const titleLower = (n.title || "").toLowerCase();
  const typeLower = (n.type || "").toLowerCase();

  let Icon: LucideIcon = Bell;
  let accentClassName = n.isRead ? "bg-slate-100 text-slate-700" : "bg-sky-100 text-sky-700";

  if (titleLower.includes("order") || typeLower.includes("order")) {
    Icon = ShoppingBag;
    accentClassName = n.isRead ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700";
  } else if (titleLower.includes("delivery") || typeLower.includes("delivery") || titleLower.includes("ship")) {
    Icon = Truck;
    accentClassName = n.isRead ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700";
  } else if (titleLower.includes("price") || titleLower.includes("offer") || titleLower.includes("promo")) {
    Icon = Megaphone;
    accentClassName = n.isRead ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700";
  } else if (titleLower.includes("confirm") || titleLower.includes("ready") || titleLower.includes("done")) {
    Icon = CheckCircle2;
    accentClassName = n.isRead ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700";
  }

  return {
    id: n.id,
    title: n.title,
    detail: n.message,
    time: formatNotificationTime(n.createdAt || n.creationDate),
    icon: Icon,
    accentClassName,
    unread: !n.isRead,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [rawNotifications, setRawNotifications] = useState<NotificationItemDto[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Load initial notifications from database
  const refreshNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      if (Array.isArray(data)) {
        setRawNotifications(data);
      }
    } catch (err) {
      console.warn("[NotificationProvider] Failed to fetch notifications:", err);
    }
  }, []);

  // Connect to WebSocket and listen for incoming messages
  useEffect(() => {
    let isActive = true;

    // 1. Initial load
    void refreshNotifications();

    // 2. Connect WebSocket
    const token = getClientAuthToken();
    if (token) {
      notificationSocket.connect(token);
    }

    // 3. Monitor connection status
    const unsubscribeStatus = notificationSocket.onStatusChange((connected) => {
      if (isActive) setIsConnected(connected);
    });

    // 4. Handle incoming real-time notifications
    const unsubscribeSocket = notificationSocket.subscribe((newNotif) => {
      if (!isActive) return;

      setRawNotifications((prev) => {
        // Prevent duplicate IDs
        const filtered = prev.filter((item) => item.id !== newNotif.id);
        return [newNotif, ...filtered];
      });

      // Show instant toast notification on screen
      showToast({
        title: newNotif.title,
        description: newNotif.message,
        variant: "info",
        durationMs: 5000,
      });
    });

    // 5. Also listen to storage events to reconnect if user logs in on another tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "auth_token" || e.key === "token" || e.key === "accessToken") {
        if (e.newValue) {
          notificationSocket.connect(e.newValue);
          void refreshNotifications();
        } else {
          notificationSocket.disconnect();
          setRawNotifications([]);
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isActive = false;
      unsubscribeStatus();
      unsubscribeSocket();
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshNotifications, showToast]);

  const markAsRead = useCallback(async (id: string) => {
    setRawNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn(`[NotificationProvider] Failed to mark ${id} as read:`, err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setRawNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true }))
    );
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn("[NotificationProvider] Failed to mark all as read:", err);
    }
  }, []);

  const notifications = useMemo(() => {
    return rawNotifications.map(mapDtoToDashboardNotification);
  }, [rawNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      rawNotifications,
      unreadCount,
      isConnected,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }),
    [
      notifications,
      rawNotifications,
      unreadCount,
      isConnected,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
