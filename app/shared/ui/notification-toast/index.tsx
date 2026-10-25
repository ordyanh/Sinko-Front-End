import { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Truck,
  ShoppingBag,
  Bell,
  Clock,
  ArrowRight,
  Gift,
  Sparkles,
} from "lucide-react";
import {
  getNotificationTheme,
  formatNotificationTime,
  isGuid,
  sanitizeOrderText,
} from "~/shared/api/notifications";
import type { ToastNotification } from "~/shared/lib/use-notification-center";
import { useTranslation } from "~/shared/lib/i18n";

type NotificationToastProps = {
  toast: ToastNotification;
  onClose: (toastId: string) => void;
  onOpenOrder: (orderId?: string, deepLink?: string, toastId?: string) => void;
};

export function NotificationToastCard({ toast, onClose, onOpenOrder }: NotificationToastProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const durationMs = toast.autoCloseMs || 9000;
  const theme = getNotificationTheme(toast, t);

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose(toast.toastId);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [durationMs, isPaused, onClose, toast.toastId]);

  // Pick suitable icon based on kind
  const renderIcon = () => {
    switch (theme.kind) {
      case "promotion":
        return <Gift className="h-5 w-5 text-white animate-bounce" />;
      case "confirmed":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-rose-600" />;
      case "progress":
        return <Truck className="h-5 w-5 text-sky-600" />;
      case "pending":
        return <ShoppingBag className="h-5 w-5 text-amber-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const hasOrderLink = Boolean(
    toast.orderId || toast.deepLink || toast.relatedId || theme.kind === "promotion",
  );

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border-2 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-primary/10 ${theme.borderClass}`}
      style={{
        boxShadow:
          theme.kind === "promotion"
            ? "0 16px 36px -4px rgba(168, 85, 247, 0.35), 0 8px 18px -3px rgba(236, 72, 153, 0.2)"
            : theme.kind === "rejected"
              ? "0 14px 30px -4px rgba(244, 63, 94, 0.22), 0 6px 14px -3px rgba(0, 0, 0, 0.08)"
              : theme.kind === "confirmed"
                ? "0 14px 30px -4px rgba(168, 85, 247, 0.22), 0 6px 14px -3px rgba(0, 0, 0, 0.08)"
                : "0 14px 30px -4px rgba(15, 23, 42, 0.16), 0 6px 14px -3px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Colored Left Accent Bar */}
      <div
        className={`absolute inset-y-0 left-0 w-2 ${theme.barClass}`}
        aria-hidden="true"
      />

      <div className="flex items-start gap-3 pl-1.5">
        {/* Status Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}
        >
          {renderIcon()}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header Row: Status Badge & Time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${theme.badgeClass}`}
              >
                {theme.kind === "promotion" ? (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {theme.badgeLabel}
                  </span>
                ) : (
                  theme.badgeLabel
                )}
              </span>

              {toast.orderNum || (toast.orderId && !isGuid(toast.orderId)) ? (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  #{toast.orderNum || toast.orderId}
                </span>
              ) : null}
            </div>

            <span className="shrink-0 text-[11px] font-medium text-slate-400">
              {formatNotificationTime(toast.createdAt || toast.creationDate, t) || t("notifications.justNow")}
            </span>
          </div>

          {/* Title */}
          <h4 className="mt-1 text-sm font-bold text-slate-900 leading-snug">
            {sanitizeOrderText(toast.title, toast.orderNum, toast.orderId)}
          </h4>

          {/* Message Description */}
          <p className="mt-0.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
            {sanitizeOrderText(toast.message, toast.orderNum, toast.orderId)}
          </p>

          {/* Action Row */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            {hasOrderLink ? (
              <button
                type="button"
                onClick={() => {
                  const targetLink =
                    toast.deepLink ||
                    (toast.relatedId ? `/horeca/promotions/${toast.relatedId}` : undefined);
                  onOpenOrder(toast.orderId, targetLink, toast.toastId);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition active:scale-95 ${theme.actionButtonClass}`}
              >
                <span>{t("common.open")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => onClose(toast.toastId)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              {t("notifications.dismiss")}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onClose(toast.toastId)}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label={t("notifications.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Auto-close Progress Bar at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-100 overflow-hidden">
        <div
          className={`h-full transition-all ease-linear ${theme.barClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export type NotificationToastContainerProps = {
  toasts: ToastNotification[];
  onClose: (toastId: string) => void;
  onOpenOrder: (orderId?: string, deepLink?: string, toastId?: string) => void;
};

export default function NotificationToastContainer({
  toasts,
  onClose,
  onOpenOrder,
}: NotificationToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-3 pointer-events-none sm:max-w-md sm:right-6 sm:top-6"
    >
      {toasts.map((toast) => (
        <NotificationToastCard
          key={toast.toastId}
          toast={toast}
          onClose={onClose}
          onOpenOrder={onOpenOrder}
        />
      ))}
    </div>
  );
}
