import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Megaphone,
  PackagePlus,
  ShoppingBag,
  Truck,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getSupplierDashboard,
  getDailySummary,
  getNotifications,
  formatNotificationTime,
  localizeNotification,
  type NotificationItemDto,
  type SupplierDashboardDto,
} from "~/shared/api";
import {
  getLoggedInUser,
  getOrdersForSupplier,
  ORDERS_UPDATED_EVENT,
  type StoredOrder,
} from "~/shared/lib/indexed-db";
import { NOTIFICATION_RECEIVED_EVENT } from "~/shared/api/notification-socket";
import { useTranslation } from "~/shared/lib/i18n";

type DashboardNotificationView = {
  title: string;
  detail: string;
  time: string;
  tone: string;
  icon: typeof ShoppingBag;
  href: string;
};

const defaultNotifications: DashboardNotificationView[] = [];

type OrderCounts = Record<"new" | "inProgress" | "closed", number>;

function countOrdersByStatus(orders: StoredOrder[]): OrderCounts {
  return orders.reduce<OrderCounts>(
    (counts, order) => {
      if (order.status === "New" || order.status === "Rejected") {
        counts.new += 1;
      } else if (
        order.status === "Waiting for restaurant confirmation" ||
        order.status === "Confirmed" ||
        order.status === "Preparing" ||
        order.status === "Shipped"
      ) {
        counts.inProgress += 1;
      } else if (
        order.status === "Delivered" ||
        order.status === "Cancelled"
      ) {
        counts.closed += 1;
      }

      return counts;
    },
    { new: 0, inProgress: 0, closed: 0 },
  );
}

export default function SupplierPage() {
  const { t } = useTranslation();
  const [orderCounts, setOrderCounts] = useState<OrderCounts>({
    new: 0,
    inProgress: 0,
    closed: 0,
  });
  const [recentOrders, setRecentOrders] = useState<StoredOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [notifications, setNotifications] = useState<DashboardNotificationView[]>(defaultNotifications);
  const [companyName, setCompanyName] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<SupplierDashboardDto | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      const user = await getLoggedInUser();
      if (!user || user.role !== "supplier") return;
      if (user.companyName) setCompanyName(user.companyName);

      // Load orders (fetches backend orders via getSupplierOrders())
      const orders = await getOrdersForSupplier(user.id);
      if (isCurrent) {
        setOrderCounts(countOrdersByStatus(orders));
        setRecentOrders(orders.slice(0, 6));
      }

      // Try loading real backend notifications
      try {
        const backendNotifs = await getNotifications();
        if (Array.isArray(backendNotifs) && backendNotifs.length > 0 && isCurrent) {
          setNotifications(
            backendNotifs.slice(0, 5).map((n) => ({
              title: n.title,
              detail: n.message,
              time: formatNotificationTime(n.createdAt || n.creationDate),
              tone: n.isRead ? "bg-slate-100 text-slate-700" : "bg-sky-100 text-sky-700",
              icon: n.title.toLowerCase().includes("order") ? ShoppingBag : BellRing,
              href: "/supplier/orders",
            })),
          );
        }
      } catch {
        // fallback
      }

      // Try loading real supplier dashboard stats
      try {
        const db = await getSupplierDashboard();
        if (db && isCurrent) {
          setDashboardData(db);
        }
      } catch {
        // fallback
      }
    }

    function refreshOrderCounts() {
      void loadData();
    }

    void loadData().finally(() => {
      if (isCurrent) setIsLoadingOrders(false);
    });
    window.addEventListener(ORDERS_UPDATED_EVENT, refreshOrderCounts);
    window.addEventListener(NOTIFICATION_RECEIVED_EVENT, refreshOrderCounts);

    return () => {
      isCurrent = false;
      window.removeEventListener(ORDERS_UPDATED_EVENT, refreshOrderCounts);
      window.removeEventListener(NOTIFICATION_RECEIVED_EVENT, refreshOrderCounts);
    };
  }, []);

  const orderStates = [
    {
      label: t("dashboard.newOrders"),
      value: orderCounts.new,
      description: t("dashboard.newOrdersDesc"),
      href: "/supplier/orders?overview=new",
      icon: BellRing,
      iconClass: "bg-sky-100 text-sky-700",
      barClass: "bg-sky-500",
    },
    {
      label: t("dashboard.inProgressOrders"),
      value: orderCounts.inProgress,
      description: t("dashboard.inProgressOrdersDesc"),
      href: "/supplier/orders?overview=in-progress",
      icon: Clock3,
      iconClass: "bg-amber-100 text-amber-700",
      barClass: "bg-amber-400",
    },
    {
      label: t("dashboard.completedOrders"),
      value: orderCounts.closed,
      description: t("dashboard.completedOrdersDesc"),
      href: "/supplier/orders?overview=closed",
      icon: Truck,
      iconClass: "bg-emerald-100 text-emerald-700",
      barClass: "bg-emerald-500",
    },
  ];

  const quickActions = [
    {
      label: t("dashboard.addProduct"),
      description: t("dashboard.addProductDesc"),
      href: "/supplier/products/new",
      icon: PackagePlus,
      accent: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    {
      label: t("dashboard.addEmployee"),
      description: t("dashboard.addEmployeeDesc"),
      href: "/supplier/employees?create=true",
      icon: UsersRound,
      accent: "bg-violet-50 text-violet-700 ring-violet-100",
    },
    {
      label: t("dashboard.createPromotion"),
      description: t("dashboard.createPromotionDesc"),
      href: "/supplier/promotions/new",
      icon: Megaphone,
      accent: "bg-amber-50 text-amber-700 ring-amber-100",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center sm:p-7">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t("dashboard.supplierWorkspace")}
          </div>
          <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            {t("dashboard.goodMorning")}{companyName ? `, ${companyName}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t("dashboard.businessPulse")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/supplier/orders"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-content shadow-xs transition hover:brightness-95"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span>{t("nav.orders", "Orders")}</span>
          </Link>
          <Link
            to="/supplier/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <PackagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{t("dashboard.addProduct")}</span>
          </Link>
        </div>
      </header>

      <section aria-labelledby="order-overview-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2
            id="order-overview-heading"
            className="text-base font-bold text-slate-900"
          >
            {t("dashboard.orderOverview")}
          </h2>
          <span className="text-xs font-medium text-slate-500">
            {isLoadingOrders ? t("dashboard.syncingOrders") : t("dashboard.updatedJustNow")}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {orderStates.map((state) => {
            const Icon = state.icon;

            return (
              <Link
                key={state.label}
                to={state.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span
                  className={`absolute inset-x-0 top-0 h-1 ${state.barClass}`}
                />
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${state.iconClass}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="mt-2 h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-950 tabular-nums">
                    {isLoadingOrders ? "—" : state.value}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {state.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {state.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Actionable Recent Orders Table */}
      {recentOrders.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {t("dashboard.fulfilmentQueue")}
              </p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900">
                {t("nav.orders", "Recent Orders")}
              </h2>
            </div>
            <Link
              to="/supplier/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>{t("common.viewAll", "View all")}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => {
              const total = order.lines.reduce(
                (sum, l) => sum + l.offeredPrice * l.offeredQuantity,
                0,
              );
              const isActionNeeded = order.status === "New" || order.status === "Rejected";
              return (
                <Link
                  key={order.id}
                  to={`/supplier/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isActionNeeded
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {order.orderNum || order.orderNumber || order.id}{" "}
                        <span className="font-normal text-slate-500">
                          · {order.horecaName}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.lines.length} {t("orders.items", "items")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isActionNeeded
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="min-w-20 text-right text-sm font-bold text-slate-900 tabular-nums">
                      {new Intl.NumberFormat("hy-AM", {
                        style: "currency",
                        currency: "AMD",
                        maximumFractionDigits: 0,
                      }).format(total)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-7 pb-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <section
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          aria-labelledby="notifications-heading"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {t("dashboard.stayInformed")}
              </p>
              <h2
                id="notifications-heading"
                className="mt-1 text-lg font-semibold text-slate-900"
              >
                {t("dashboard.recentNotifications")}
              </h2>
            </div>
            {notifications.length > 0 ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-primary">
                {notifications.length} {t("common.details")}
              </span>
            ) : null}
          </div>
          {notifications.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                const loc = localizeNotification(notification.title, notification.detail, undefined, undefined, t);
                return (
                  <li key={notification.title}>
                    <Link
                      to={notification.href}
                      className="group flex gap-3 px-5 py-4 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.tone}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-primary">
                          {loc.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {loc.message}
                        </p>
                      </div>
                      {notification.time && notification.time !== "Invalid Date" ? (
                        <time className="shrink-0 text-xs font-medium text-slate-400">
                          {notification.time}
                        </time>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">{t("dashboard.noRecentNotifications")}</p>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          aria-labelledby="quick-actions-heading"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {t("dashboard.shortcuts")}
          </p>
          <h2
            id="quick-actions-heading"
            className="mt-1 text-lg font-semibold text-slate-900"
          >
            {t("dashboard.quickActions")}
          </h2>
          <div className="mt-5 space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-primary/30 hover:bg-sky-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${action.accent}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
