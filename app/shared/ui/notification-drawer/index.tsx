import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Bell, CheckCheck, X, ArrowRight, Gift, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslation } from "~/shared/lib/i18n";
import {
  getNotificationTheme,
  isGuid,
  sanitizeOrderText,
  localizeNotification,
  type NotificationStatusKind,
} from "~/shared/api/notifications";

export type DashboardNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: LucideIcon;
  accentClassName: string;
  unread?: boolean;
  orderId?: string;
  orderNum?: string;
  status?: number;
  statusKind?: NotificationStatusKind;
  deepLink?: string;
  onOpen?: () => void;
};

type NotificationDrawerProps = {
  open: boolean;
  onClose: (open: boolean) => void;
  notifications: DashboardNotification[];
  onMarkAllRead?: () => void;
  onOpenOrder?: (orderId?: string, deepLink?: string) => void;
  isConnected?: boolean;
};

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onOpenOrder,
  isConnected = false,
}: NotificationDrawerProps) {
  const { t } = useTranslation();
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const handleOpenItem = (notification: DashboardNotification) => {
    if (notification.onOpen) {
      notification.onOpen();
    } else if (onOpenOrder) {
      onOpenOrder(notification.orderId, notification.deepLink);
    }
    onClose(false);
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] transition duration-200 data-closed:opacity-0" />
      <div className="fixed inset-0 flex justify-end">
        <DialogPanel className="flex h-full w-full max-w-md flex-col bg-[#fffefa] shadow-2xl transition duration-300 data-closed:translate-x-full sm:w-[28rem]">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Bell className="h-4 w-4" aria-hidden="true" />
                {t("notifications.updates", "Updates")}
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("notifications.live", "Live")}
                  </span>
                ) : null}
              </div>
              <DialogTitle className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                {t("notifications.title", "Notifications")}
              </DialogTitle>
              <p className="mt-1 text-sm text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} ${unreadCount === 1 ? t("notifications.newUpdate", "new update") : t("notifications.newUpdates", "new updates")}`
                  : t("notifications.allCaughtUp", "You’re all caught up")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && onMarkAllRead ? (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  title={t("notifications.markAllRead", "Mark all as read")}
                >
                  <CheckCheck className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">{t("notifications.markAllRead", "Mark all as read")}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => onClose(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={t("notifications.close", "Close notifications")}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <ul className="space-y-3" aria-label={t("notifications.title", "Notifications")}>
                {notifications.map((notification) => {
                  const localized = localizeNotification(
                    notification.title,
                    notification.detail,
                    notification.orderNum,
                    notification.orderId,
                    t,
                  );
                  const theme = getNotificationTheme({
                    status: notification.status,
                    notificationType: notification.statusKind === "promotion" ? 50 : undefined,
                    title: localized.title,
                    message: localized.message,
                    relatedId: notification.deepLink?.includes("/promotions/") ? "promo-item" : undefined,
                  }, t);
                  const isPromo = theme.kind === "promotion";
                  const Icon = isPromo ? Gift : notification.icon;
                  const hasOrderLink = Boolean(
                    notification.orderId || notification.deepLink || notification.onOpen || isPromo,
                  );

                  return (
                    <li
                      key={notification.id}
                      className={`relative flex flex-col gap-2 rounded-2xl border p-3.5 transition hover:shadow-sm ${
                        notification.unread
                          ? isPromo
                            ? `${theme.bgClass} ${theme.borderClass} ring-1 ring-purple-400/40 shadow-md shadow-purple-100`
                            : `${theme.bgClass} ${theme.borderClass}`
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {/* Left vertical status indicator */}
                      <span
                        className={`absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl ${
                          notification.unread ? theme.barClass : "bg-slate-300"
                        }`}
                        aria-hidden="true"
                      />

                      <div className="flex items-start gap-3 pl-1">
                        <span
                          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            notification.unread ? theme.iconBg : notification.accentClassName
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isPromo ? "animate-pulse" : ""}`} aria-hidden="true" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badgeClass}`}
                              >
                                {isPromo ? <Sparkles className="h-2.5 w-2.5" /> : null}
                                {theme.badgeLabel}
                              </span>

                              {notification.orderNum || (notification.orderId && !isGuid(notification.orderId)) ? (
                                <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                  #{notification.orderNum || notification.orderId}
                                </span>
                              ) : null}
                            </div>

                            {notification.time && notification.time !== "Invalid Date" ? (
                              <time className="shrink-0 pt-0.5 text-[11px] font-medium text-slate-400">
                                {notification.time}
                              </time>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm font-semibold leading-5 text-slate-900">
                            {localized.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-slate-600">
                            {localized.message}
                          </p>

                          {hasOrderLink ? (
                            <div className="mt-2.5 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenItem(notification)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95 ${theme.actionButtonClass}`}
                              >
                                <span>{t("common.open")}</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CheckCheck className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-slate-900">
                {t("notifications.emptyTitle", "No notifications yet")}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t("notifications.emptyDesc", "New activity will appear here.")}
              </p>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
