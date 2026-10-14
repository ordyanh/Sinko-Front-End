import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { SwitchField } from "~/shared/ui/form";
import { useToast } from "~/shared/ui/toast";
import { DashboardPageContent } from "~/shared/ui";
import { getNotificationSettings, updateNotificationSettings } from "~/shared/api";
import { useTranslation } from "~/shared/lib/i18n";

type NotificationKey =
  | "newOrderReceived"
  | "priceRequestReceived"
  | "priceOfferReceived"
  | "orderStatusChanges"
  | "employeeActivity";

type NotificationSetting = {
  key: NotificationKey;
  title: string;
  description: string;
};

// Mock data standing in for the supplier notification preferences until the API is wired up.
const initialNotifications: Record<NotificationKey, boolean> = {
  newOrderReceived: true,
  priceRequestReceived: true,
  priceOfferReceived: false,
  orderStatusChanges: false,
  employeeActivity: false,
};

export default function SupplierNotificationsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [submittingKey, setSubmittingKey] = useState<NotificationKey | null>(
    null,
  );

  const notificationSettings: NotificationSetting[] = useMemo(
    () => [
      {
        key: "newOrderReceived",
        title: t("settings.newOrderReceivedTitle"),
        description: t("settings.newOrderReceivedDesc"),
      },
      {
        key: "priceRequestReceived",
        title: t("settings.priceRequestReceivedTitle"),
        description: t("settings.priceRequestReceivedDesc"),
      },
      {
        key: "priceOfferReceived",
        title: t("settings.priceOfferReceivedTitle"),
        description: t("settings.priceOfferReceivedDesc"),
      },
      {
        key: "orderStatusChanges",
        title: t("settings.orderStatusChangesTitle"),
        description: t("settings.orderStatusChangesDesc"),
      },
      {
        key: "employeeActivity",
        title: t("settings.employeeActivityTitle"),
        description: t("settings.employeeActivityDesc"),
      },
    ],
    [t],
  );

  useEffect(() => {
    let isActive = true;
    getNotificationSettings()
      .then((s) => {
        if (!isActive || !s) return;
        setNotifications({
          newOrderReceived: s.orderUpdates ?? initialNotifications.newOrderReceived,
          priceRequestReceived: s.priceOffers ?? initialNotifications.priceRequestReceived,
          priceOfferReceived: s.priceOffers ?? initialNotifications.priceOfferReceived,
          orderStatusChanges: s.orderUpdates ?? initialNotifications.orderStatusChanges,
          employeeActivity: s.promotions ?? initialNotifications.employeeActivity,
        });
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, []);

  function handleSaveSetting(key: NotificationKey, title: string) {
    return async (checked: boolean) => {
      setSubmittingKey(key);
      const next = { ...notifications, [key]: checked };
      setNotifications(next);

      try {
        await updateNotificationSettings({
          orderUpdates: next.newOrderReceived || next.orderStatusChanges,
          priceOffers: next.priceRequestReceived || next.priceOfferReceived,
          promotions: next.employeeActivity,
        });
      } catch {
        // Backend offline fallback
      } finally {
        setSubmittingKey(null);
      }

      showToast({
        title: `${title} ${checked ? t("common.active") : t("common.inactive")}`,
        description: t("settings.languageUpdatedDesc"),
        variant: "success",
      });
    };
  }

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t("settings.notifications")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t("settings.notificationsTitle")}
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {t("settings.notificationsSubtitle")}
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {t("settings.alertsAndUpdates")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("settings.alertsSubtitle")}
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-slate-100">
            {notificationSettings.map((setting) => (
              <SwitchField
                key={setting.key}
                title={setting.title}
                description={setting.description}
                checked={notifications[setting.key]}
                onSave={handleSaveSetting(setting.key, setting.title)}
                isSubmitting={submittingKey === setting.key}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardPageContent>
  );
}
