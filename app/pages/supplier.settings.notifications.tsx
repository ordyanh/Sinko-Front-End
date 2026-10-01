import { useState } from "react";
import { Bell } from "lucide-react";
import { SwitchField } from "~/shared/ui/form";
import { useToast } from "~/shared/ui/toast";
import { DashboardPageContent } from "~/shared/ui";

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

const notificationSettings: NotificationSetting[] = [
  {
    key: "newOrderReceived",
    title: "New order received",
    description: "When a new order is placed or assigned to you",
  },
  {
    key: "priceRequestReceived",
    title: "Price request received",
    description: "When a restaurant requests a price offer",
  },
  {
    key: "priceOfferReceived",
    title: "Price offer received",
    description: "When a supplier responds with a price offer",
  },
  {
    key: "orderStatusChanges",
    title: "Order status changes",
    description: "When an order status is updated by any party",
  },
  {
    key: "employeeActivity",
    title: "Employee activity",
    description: "When an employee accepts or modifies an order",
  },
];

// Mock data standing in for the supplier notification preferences until the API is wired up.
const initialNotifications: Record<NotificationKey, boolean> = {
  newOrderReceived: true,
  priceRequestReceived: true,
  priceOfferReceived: false,
  orderStatusChanges: false,
  employeeActivity: false,
};

const MOCK_SAVE_DELAY_MS = 600;

export default function SupplierNotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [submittingKey, setSubmittingKey] = useState<NotificationKey | null>(
    null,
  );

  function handleSaveSetting(key: NotificationKey, title: string) {
    return (checked: boolean) => {
      setSubmittingKey(key);

      window.setTimeout(() => {
        setNotifications((current) => ({ ...current, [key]: checked }));
        setSubmittingKey(null);
        showToast({
          title: `${title} ${checked ? "enabled" : "disabled"}`,
          description: "Your notification preferences have been saved.",
          variant: "success",
        });
      }, MOCK_SAVE_DELAY_MS);
    };
  }

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Notifications
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Notification settings
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Control the alerts you receive about orders, requests and supplier
            activity.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Alerts and updates
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose which events should notify you in the dashboard.
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
