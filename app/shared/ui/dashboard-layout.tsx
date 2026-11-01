import { NavLink, useLocation } from "react-router";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  Bell,
  Building2,
  Package,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldUser,
  ShoppingBag,
  Store,
  Tags,
  Users,
  Users2,
  type LucideIcon,
  X,
  Truck,
  Gift,
} from "lucide-react";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import NotificationDrawer, {
  type DashboardNotification,
} from "./notification-drawer";
import NotificationToastContainer from "./notification-toast";
import { useNotificationCenter } from "~/shared/lib/use-notification-center";
import { getNotificationTheme, formatNotificationTime } from "~/shared/api/notifications";
import LanguageSwitcher from "./language-switcher";
import ThemeToggle from "./theme-toggle";
import { useTranslation } from "~/shared/lib/i18n";
import {
  DashboardHeaderActionsContext,
  type DashboardHeaderActionContent,
} from "./dashboard-header-actions";
import {
  DashboardContentWidthContext,
  type DashboardContentWidth,
} from "./dashboard-content-width";

export type DashboardAccountType = "horeca" | "supplier";

export type DashboardMenuLink = {
  label: string;
  href: string;
  end?: boolean;
  title?: string;
  description?: string;
  submenuLinks?: DashboardSubMenuLink[];
};

export type DashboardSubMenuLink = {
  label: string;
  href: string;
};

const menuIcons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Products: Package,
  Suppliers: Store,
  Customers: Users2,
  Orders: ShoppingBag,
  Promotions: Megaphone,
  Settings: Settings,
  "Company Information": Building2,
  "Supplier profile": Tags,
  Employees: Users,
  Notifications: Bell,
  Account: ShieldUser,
};

function getIconForLabel(label: string) {
  return menuIcons[label] ?? ChevronRight;
}

function getNavLabel(label: string, t: (k: string, f?: string) => string): string {
  const map: Record<string, string> = {
    Dashboard: "nav.dashboard",
    Products: "nav.products",
    Suppliers: "nav.suppliers",
    Customers: "nav.customers",
    Orders: "nav.orders",
    Employees: "nav.employees",
    Promotions: "nav.promotions",
    Settings: "nav.settings",
    "Company Information": "nav.companyInformation",
    "Supplier profile": "nav.supplierProfile",
    Account: "nav.account",
    Notifications: "nav.notifications",
    Cart: "nav.cart",
  };
  return map[label] ? t(map[label], label) : label;
}

type DashboardLayoutProps = {
  accountType: DashboardAccountType;
  menuLinks: DashboardMenuLink[];
  userName: string;
  companyName: string;
  logoutHref?: string;
  notifications?: DashboardNotification[];
  desktopHeaderAction?: ReactNode;
  mobileHeaderAction?: ReactNode;
  children?: ReactNode;
};

function getInitials(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "S";
  }

  const [firstWord = "", secondWord = ""] = trimmed.split(/\s+/);
  const firstChar = firstWord.charAt(0).toUpperCase();
  const secondChar = secondWord.charAt(0).toUpperCase();

  return `${firstChar}${secondChar}`.trim() || "S";
}

export default function DashboardLayout({
  accountType,
  menuLinks,
  userName,
  companyName,
  logoutHref = "/login",
  notifications = [],
  desktopHeaderAction,
  mobileHeaderAction,
  children,
}: DashboardLayoutProps) {
  const initials = getInitials(userName || companyName);
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pageHeaderActions, setPageHeaderActions] =
    useState<DashboardHeaderActionContent | null>(null);
  const [contentWidth, setContentWidth] =
    useState<DashboardContentWidth>("full");
  const location = useLocation();
  const [expandedSubmenus, setExpandedSubmenus] = useState<
    Record<string, boolean>
  >({});
  const [mobileExpandedSubmenus, setMobileExpandedSubmenus] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("synko-sidebar-collapsed");
      if (saved === "true") setIsSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleSidebarCollapsed() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("synko-sidebar-collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, []);

  function isPathWithin(basePath: string) {
    return (
      location.pathname === basePath ||
      location.pathname.startsWith(`${basePath}/`)
    );
  }

  function isMenuItemActive(item: DashboardMenuLink) {
    if (item.end) {
      return location.pathname === item.href;
    }

    return isPathWithin(item.href);
  }

  const activeMenuItem = useMemo(() => {
    for (const item of menuLinks) {
      if (item.submenuLinks?.some((sub) => isPathWithin(sub.href))) {
        const sub = item.submenuLinks.find((s) => isPathWithin(s.href));
        return { parent: item, current: sub ?? item };
      }
      if (isMenuItemActive(item)) {
        return { parent: null, current: item };
      }
    }
    return { parent: null, current: menuLinks[0] ?? null };
  }, [location.pathname, menuLinks]);

  const notifCenter = useNotificationCenter(accountType);

  const displayNotifications: DashboardNotification[] = useMemo(() => {
    if (notifCenter.notifications.length > 0) {
      return notifCenter.notifications.map((n) => {
        const theme = getNotificationTheme(n, t);
        const isDelivery =
          n.title.toLowerCase().includes("delivery") ||
          n.message.toLowerCase().includes("delivery") ||
          n.message.toLowerCase().includes("առաքում");
        const isOrder =
          n.title.toLowerCase().includes("order") ||
          n.message.toLowerCase().includes("order") ||
          n.message.toLowerCase().includes("պատվեր");

        let Icon = ShoppingBag;
        if (theme.kind === "promotion") Icon = Gift;
        else if (isDelivery) Icon = Truck;
        else if (theme.kind === "confirmed") Icon = Package;
        else if (theme.kind === "rejected") Icon = X;
        else if (isOrder) Icon = ShoppingBag;

        return {
          id: n.id,
          title: n.title,
          detail: n.message,
          time: formatNotificationTime(n.createdAt || n.creationDate, t),
          icon: Icon,
          accentClassName: n.isRead ? "bg-slate-100 text-slate-700" : theme.iconBg,
          unread: !n.isRead,
          orderId: n.orderId,
          orderNum: n.orderNum,
          status: n.status,
          statusKind: theme.kind,
          deepLink: n.deepLink,
          onOpen: () => {
            void notifCenter.markAsRead(n.id);
            notifCenter.openOrder(n.orderId, n.deepLink);
          },
        };
      });
    }

    return notifications;
  }, [notifCenter, notifications, t]);

  const [hasDismissedBadge, setHasDismissedBadge] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  useEffect(() => {
    if (isNotificationsOpen) {
      setHasDismissedBadge(true);
      void notifCenter.markAllRead();
    }
  }, [isNotificationsOpen, notifCenter]);

  useEffect(() => {
    if (notifCenter.unreadCount > prevUnreadCount) {
      setHasDismissedBadge(false);
    }
    setPrevUnreadCount(notifCenter.unreadCount);
  }, [notifCenter.unreadCount, prevUnreadCount]);

  const effectiveUnreadCount = hasDismissedBadge
    ? 0
    : notifCenter.unreadCount > 0
      ? notifCenter.unreadCount
      : notifications.filter((notification) => notification.unread).length;

  const notificationButton = (
    <button
      type="button"
      onClick={() => {
        setIsNotificationsOpen(true);
        setHasDismissedBadge(true);
        void notifCenter.markAllRead();
      }}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`${t("notifications.title", "Notifications")}${effectiveUnreadCount > 0 ? `, ${effectiveUnreadCount}` : ""}`}
    >
      <Bell className="h-4.5 w-4.5" aria-hidden="true" />
      {notifCenter.isConnected ? (
        <span
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
          title={t("notifications.liveConnected", "Live WebSocket Connected")}
        />
      ) : null}
      {effectiveUnreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white tabular-nums shadow-xs">
          {effectiveUnreadCount > 99 ? "99+" : effectiveUnreadCount}
        </span>
      ) : null}
    </button>
  );

  const mobileBottomLinks = menuLinks.slice(0, 4);

  return (
    <DashboardContentWidthContext.Provider value={setContentWidth}>
      <DashboardHeaderActionsContext.Provider value={setPageHeaderActions}>
        <div
          data-account-type={accountType}
          className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900"
        >
          <div className="min-h-0 w-full flex-1">
            {/* Desktop Sidebar */}
            <aside
              className={`fixed inset-y-0 left-0 z-30 hidden overflow-y-auto border-r border-slate-200/80 bg-white transition-all duration-200 lg:flex lg:flex-col ${
                isSidebarCollapsed ? "w-20 px-3 py-5" : "w-64 px-4 py-5"
              }`}
            >
              <div
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center" : "justify-between px-2"
                }`}
              >
                <a
                  href="/"
                  className="flex items-center gap-2.5 rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  title="Synko"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-content shadow-xs">
                    S
                  </span>
                  {!isSidebarCollapsed ? (
                    <div className="min-w-0">
                      <span className="block text-xl font-bold leading-none tracking-tight text-slate-900">
                        Synko
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                        {accountType === "horeca" ? "HoReCa" : "Supplier"}
                      </span>
                    </div>
                  ) : null}
                </a>

                {!isSidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={toggleSidebarCollapsed}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose size={17} />
                  </button>
                ) : null}
              </div>

              {isSidebarCollapsed ? (
                <button
                  type="button"
                  onClick={toggleSidebarCollapsed}
                  className="mx-auto mt-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen size={17} />
                </button>
              ) : (
                <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {getInitials(companyName || userName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {companyName || userName}
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {userName}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="mt-5 flex flex-1 flex-col gap-1">
                {menuLinks.map((item) => {
                  const submenuLinks = item.submenuLinks ?? [];
                  const hasActiveChild = submenuLinks.some((submenuItem) =>
                    isPathWithin(submenuItem.href),
                  );
                  const showsSubmenu = submenuLinks.length > 0;
                  const itemIsActive = showsSubmenu
                    ? isMenuItemActive(item) || hasActiveChild
                    : isMenuItemActive(item);
                  const isSubmenuExpanded =
                    expandedSubmenus[item.href] ?? itemIsActive;
                  const ItemIcon = getIconForLabel(item.label);
                  const translatedLabel = getNavLabel(item.label, t);

                  return (
                    <div key={item.href + item.label} className="space-y-1">
                      <div
                        className={`flex items-center rounded-xl transition ${
                          itemIsActive
                            ? "bg-primary text-primary-content shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        } ${isSidebarCollapsed ? "justify-center p-1" : "gap-1 px-1.5 py-0.5"}`}
                      >
                        <NavLink
                          to={item.href}
                          end={item.end}
                          title={isSidebarCollapsed ? translatedLabel : undefined}
                          className={`flex min-w-0 items-center rounded-lg text-sm font-semibold transition ${
                            isSidebarCollapsed
                              ? "h-10 w-10 justify-center"
                              : "flex-1 gap-3 px-2.5 py-2"
                          }`}
                        >
                          <ItemIcon size={18} className="shrink-0" />
                          {!isSidebarCollapsed ? (
                            <span className="truncate">{translatedLabel}</span>
                          ) : null}
                        </NavLink>

                        {!isSidebarCollapsed && showsSubmenu ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubmenus((current) => ({
                                ...current,
                                [item.href]: !isSubmenuExpanded,
                              }))
                            }
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                              itemIsActive
                                ? "text-primary-content/90 hover:bg-white/15 hover:text-primary-content"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            }`}
                            aria-label={`${isSubmenuExpanded ? "Collapse" : "Expand"} ${item.label} menu`}
                            aria-expanded={isSubmenuExpanded}
                          >
                            {isSubmenuExpanded ? (
                              <ChevronDown size={15} />
                            ) : (
                              <ChevronRight size={15} />
                            )}
                          </button>
                        ) : null}
                      </div>

                      {!isSidebarCollapsed && showsSubmenu && isSubmenuExpanded ? (
                        <div className="ml-3.5 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-2.5">
                          {submenuLinks.map((submenuItem) => {
                            const SubmenuIcon = getIconForLabel(submenuItem.label);

                            return (
                              <NavLink
                                key={submenuItem.href + submenuItem.label}
                                to={submenuItem.href}
                                className={({ isActive }) =>
                                  `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                  }`
                                }
                              >
                                <SubmenuIcon size={14} className="shrink-0" />
                                <span className="truncate">
                                  {getNavLabel(submenuItem.label, t)}
                                </span>
                              </NavLink>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </nav>

              <div className="mt-4 border-t border-slate-200/80 pt-4">
                {isSidebarCollapsed ? (
                  <a
                    href={logoutHref}
                    title={t("nav.logout")}
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <LogOut size={16} />
                  </a>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {userName}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {companyName}
                        </p>
                      </div>
                    </div>
                    <a
                      href={logoutHref}
                      title={t("nav.logout")}
                      aria-label={t("nav.logout")}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <LogOut size={15} />
                    </a>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Content Column */}
            <div
              className={`flex h-full min-w-0 flex-col transition-all duration-200 ${
                isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
              }`}
            >
              {/* Mobile Top Header */}
              <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-2xs backdrop-blur-md lg:hidden sm:px-5">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                    aria-label="Open navigation menu"
                  >
                    <Menu size={18} />
                  </button>

                  <a href="/" className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-content">
                      S
                    </span>
                    <span className="truncate text-base font-bold leading-none tracking-tight text-slate-900 max-[380px]:hidden">
                      {activeMenuItem.current
                        ? getNavLabel(activeMenuItem.current.label, t)
                        : "Synko"}
                    </span>
                  </a>

                  <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    {notificationButton}
                    {mobileHeaderAction ?? (
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
                {pageHeaderActions ? (
                  <div className="mt-2.5 flex flex-col gap-2.5 border-t border-slate-200/80 pt-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="self-start">{pageHeaderActions.back}</div>
                    <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                      {pageHeaderActions.actions}
                    </div>
                  </div>
                ) : null}
              </header>

              {/* Desktop Top Header */}
              <header className="sticky top-0 z-20 hidden border-b border-slate-200/80 bg-white/95 px-8 py-2.5 shadow-2xs backdrop-blur-md lg:block">
                <div
                  className={`mx-auto flex min-h-10 w-full items-center gap-4 ${
                    contentWidth === "reading" ? "max-w-7xl" : "max-w-none"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {pageHeaderActions?.back ? (
                      pageHeaderActions.back
                    ) : activeMenuItem.current ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-400">
                          {companyName || (accountType === "horeca" ? "HoReCa" : "Supplier")}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                        {activeMenuItem.parent ? (
                          <>
                            <span className="font-medium text-slate-500">
                              {getNavLabel(activeMenuItem.parent.label, t)}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                          </>
                        ) : null}
                        <span className="font-semibold text-slate-900">
                          {getNavLabel(activeMenuItem.current.label, t)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2.5">
                    {pageHeaderActions?.actions ?? desktopHeaderAction}
                    <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
                    <ThemeToggle />
                    <LanguageSwitcher />
                    {notificationButton}
                  </div>
                </div>
              </header>

              {/* Main Scrollable Viewport */}
              <main className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
                {children}
              </main>

              {/* Mobile Bottom Quick Navigation Bar */}
              <nav
                aria-label="Mobile quick navigation"
                className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-slate-200/90 bg-white/95 px-2 py-1.5 backdrop-blur-md lg:hidden"
              >
                {mobileBottomLinks.map((item) => {
                  const Icon = getIconForLabel(item.label);
                  const active = isMenuItemActive(item);
                  return (
                    <NavLink
                      key={`bottom-${item.href}`}
                      to={item.href}
                      end={item.end}
                      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition ${
                        active
                          ? "text-primary"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="max-w-full truncate">
                        {getNavLabel(item.label, t)}
                      </span>
                    </NavLink>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  <Menu size={18} className="shrink-0" />
                  <span className="truncate">{t("nav.settings", "Menu")}</span>
                </button>
              </nav>
            </div>

            {/* Mobile Slide-Over Navigation Drawer */}
            <Dialog
              open={isMobileMenuOpen}
              onClose={setIsMobileMenuOpen}
              className="relative z-40 lg:hidden"
            >
              <DialogBackdrop className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
              <div className="fixed inset-0 flex">
                <DialogPanel className="relative flex h-full w-[82vw] max-w-xs flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                    aria-label="Close navigation menu"
                  >
                    <X size={16} />
                  </button>

                  <a href="/" className="mt-1 flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-content">
                      S
                    </span>
                    <span className="text-xl font-bold leading-none tracking-tight text-slate-900">
                      Synko
                    </span>
                  </a>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {t("nav.company")}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">
                      {companyName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{userName}</p>
                  </div>

                  <nav className="mt-5 flex flex-1 flex-col gap-1">
                    {menuLinks.map((item) => {
                      const submenuLinks = item.submenuLinks ?? [];
                      const hasActiveChild = submenuLinks.some((submenuItem) =>
                        isPathWithin(submenuItem.href),
                      );
                      const showsSubmenu = submenuLinks.length > 0;
                      const itemIsActive = showsSubmenu
                        ? isMenuItemActive(item) || hasActiveChild
                        : isMenuItemActive(item);
                      const isSubmenuExpanded =
                        mobileExpandedSubmenus[item.href] ?? itemIsActive;
                      const ItemIcon = getIconForLabel(item.label);

                      return (
                        <div
                          key={`mobile-${item.href}-${item.label}`}
                          className="space-y-1"
                        >
                          <div
                            className={`flex items-center gap-1 rounded-xl px-1.5 py-0.5 transition ${
                              itemIsActive
                                ? "bg-primary text-primary-content"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <NavLink
                              to={item.href}
                              end={item.end}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition"
                            >
                              <ItemIcon size={17} className="shrink-0" />
                              <span className="truncate">{getNavLabel(item.label, t)}</span>
                            </NavLink>

                            {showsSubmenu ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setMobileExpandedSubmenus((current) => ({
                                    ...current,
                                    [item.href]: !isSubmenuExpanded,
                                  }))
                                }
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                                  itemIsActive
                                    ? "text-primary-content/90 hover:bg-white/15 hover:text-primary-content"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                }`}
                                aria-label={`${isSubmenuExpanded ? "Collapse" : "Expand"} ${item.label} menu`}
                                aria-expanded={isSubmenuExpanded}
                              >
                                {isSubmenuExpanded ? (
                                  <ChevronDown size={15} />
                                ) : (
                                  <ChevronRight size={15} />
                                )}
                              </button>
                            ) : null}
                          </div>

                          {showsSubmenu && isSubmenuExpanded ? (
                            <div className="ml-3.5 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-2.5">
                              {submenuLinks.map((submenuItem) => {
                                const SubmenuIcon = getIconForLabel(
                                  submenuItem.label,
                                );

                                return (
                                  <NavLink
                                    key={`mobile-${submenuItem.href}-${submenuItem.label}`}
                                    to={submenuItem.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                      `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                        isActive
                                          ? "bg-primary/10 text-primary"
                                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                      }`
                                    }
                                  >
                                    <SubmenuIcon size={14} className="shrink-0" />
                                    <span className="truncate">
                                      {getNavLabel(submenuItem.label, t)}
                                    </span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </nav>

                  <a
                    href={logoutHref}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <LogOut size={16} />
                    {t("nav.logout")}
                  </a>
                </DialogPanel>
              </div>
            </Dialog>
          </div>

          <NotificationToastContainer
            toasts={notifCenter.activeToasts}
            onClose={notifCenter.dismissToast}
            onOpenOrder={(orderId, deepLink, toastId) => {
              if (toastId) void notifCenter.markAsRead(toastId);
              notifCenter.openOrder(orderId, deepLink, toastId);
            }}
          />

          <NotificationDrawer
            open={isNotificationsOpen}
            onClose={setIsNotificationsOpen}
            notifications={displayNotifications}
            onMarkAllRead={notifCenter.markAllRead}
            isConnected={notifCenter.isConnected}
            onOpenOrder={(orderId, deepLink) => {
              notifCenter.openOrder(orderId, deepLink);
            }}
          />
        </div>
      </DashboardHeaderActionsContext.Provider>
    </DashboardContentWidthContext.Provider>
  );
}
