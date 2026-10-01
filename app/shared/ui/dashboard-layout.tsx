import { NavLink, useLocation } from "react-router";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  Bell,
  Building2,
  Package,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  ShieldUser,
  ShoppingBag,
  Store,
  Tags,
  Users,
  Users2,
  type LucideIcon,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import NotificationDrawer, {
  type DashboardNotification,
} from "./notification-drawer";
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
  const initials = getInitials(userName);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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

  const unreadNotificationCount = notifications.filter(
    (notification) => notification.unread,
  ).length;

  const notificationButton = (
    <button
      type="button"
      onClick={() => setIsNotificationsOpen(true)}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`Open notifications${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} unread` : ""}`}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadNotificationCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-content ring-2 ring-[#f3f6f4] tabular-nums">
          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <DashboardContentWidthContext.Provider value={setContentWidth}>
    <DashboardHeaderActionsContext.Provider value={setPageHeaderActions}>
    <div
      data-account-type={accountType}
      className="flex h-dvh flex-col overflow-hidden bg-[#f3f6f4] text-slate-900"
    >
      <div className="min-h-0 w-full flex-1">
        <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-slate-200/80 bg-white/90 px-5 py-6 lg:flex lg:flex-col">
          <a href="/" className="flex items-center gap-3 rounded-2xl px-3 py-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-content">
              S
            </span>
            <span className="text-2xl font-semibold leading-none tracking-tight text-slate-900">
              Synko
            </span>
          </a>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Company
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-900">
              {companyName}
            </p>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-1.5">
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

              return (
                <div key={item.href + item.label} className="space-y-1.5">
                  <div
                    className={`flex items-center gap-2 rounded-2xl px-2 py-1 transition ${
                      itemIsActive
                        ? "bg-primary text-primary-content shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <NavLink
                      to={item.href}
                      end={item.end}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition"
                    >
                      <ItemIcon size={16} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>

                    {showsSubmenu ? (
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
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    ) : null}
                  </div>

                  {showsSubmenu && isSubmenuExpanded ? (
                    <div className="ml-2 flex flex-col gap-1 border-l border-slate-200 pl-3">
                      {submenuLinks.map((submenuItem) => {
                        const SubmenuIcon = getIconForLabel(submenuItem.label);

                        return (
                          <NavLink
                            key={submenuItem.href + submenuItem.label}
                            to={submenuItem.href}
                            className={({ isActive }) =>
                              `flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                                isActive
                                  ? "bg-primary/15 text-primary"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              }`
                            }
                          >
                            <SubmenuIcon size={14} className="shrink-0" />
                            <span className="truncate">
                              {submenuItem.label}
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

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <p className="truncate text-sm font-medium text-slate-700">
                {userName}
              </p>
            </div>
            <a
              href={logoutHref}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Logout
            </a>
          </div>
        </aside>

        <div className="flex h-full min-w-0 flex-col lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-3 py-3 shadow-sm backdrop-blur lg:hidden sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>

              <a href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-content">
                  S
                </span>
                <span className="text-xl font-semibold leading-none tracking-tight text-slate-900 max-[374px]:hidden">
                  Synko
                </span>
              </a>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {notificationButton}
                {mobileHeaderAction ?? (
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials}
                  </div>
                )}
              </div>
            </div>
            {pageHeaderActions ? (
              <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="self-start">{pageHeaderActions.back}</div>
                <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                  {pageHeaderActions.actions}
                </div>
              </div>
            ) : null}
          </header>

          <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/90 px-10 py-3 shadow-sm backdrop-blur lg:block">
            <div
              className={`mx-auto flex min-h-10 w-full items-center gap-4 ${
                contentWidth === "reading"
                  ? "max-w-7xl"
                  : "max-w-none"
              }`}
            >
              <div className="min-w-0 flex-1">{pageHeaderActions?.back}</div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                {pageHeaderActions?.actions ?? desktopHeaderAction}
                {notificationButton}
              </div>
            </div>
          </header>

          <main className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>

        <Dialog
          open={isMobileMenuOpen}
          onClose={setIsMobileMenuOpen}
          className="relative z-40 lg:hidden"
        >
          <DialogBackdrop className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px]" />
          <div className="fixed inset-0 flex">
            <DialogPanel className="relative h-full w-[82vw] max-w-xs overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-2xl">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                aria-label="Close navigation menu"
              >
                <X size={16} />
              </button>

              <a href="/" className="mt-2 flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-content">
                  S
                </span>
                <span className="text-xl font-semibold leading-none tracking-tight text-slate-900">
                  Synko
                </span>
              </a>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Company
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                  {companyName}
                </p>
              </div>

              <nav className="mt-6 flex flex-col gap-1.5">
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
                      className="space-y-1.5"
                    >
                      <div
                        className={`flex items-center gap-2 rounded-2xl px-2 py-1 transition ${
                          itemIsActive
                            ? "bg-primary text-primary-content"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <NavLink
                          to={item.href}
                          end={item.end}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition"
                        >
                          <ItemIcon size={16} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
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
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        ) : null}
                      </div>

                      {showsSubmenu && isSubmenuExpanded ? (
                        <div className="ml-2 flex flex-col gap-1 border-l border-slate-200 pl-3">
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
                                  `flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                                    isActive
                                      ? "bg-primary/15 text-primary"
                                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                  }`
                                }
                              >
                                <SubmenuIcon size={14} className="shrink-0" />
                                <span className="truncate">
                                  {submenuItem.label}
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
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Logout
              </a>
            </DialogPanel>
          </div>
        </Dialog>
      </div>

      <NotificationDrawer
        open={isNotificationsOpen}
        onClose={setIsNotificationsOpen}
        notifications={notifications}
      />

      <footer className="border-t border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-500 lg:hidden sm:px-6">
        <div className="flex w-full items-center justify-between">
          <span>{companyName}</span>
          <span className="font-medium text-slate-600">
            {accountType.toUpperCase()}
          </span>
        </div>
      </footer>
    </div>
    </DashboardHeaderActionsContext.Provider>
    </DashboardContentWidthContext.Provider>
  );
}
