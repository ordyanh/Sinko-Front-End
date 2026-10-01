import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Bell, CheckCheck, X, type LucideIcon } from "lucide-react";

export type DashboardNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: LucideIcon;
  accentClassName: string;
  unread?: boolean;
};

type NotificationDrawerProps = {
  open: boolean;
  onClose: (open: boolean) => void;
  notifications: DashboardNotification[];
};

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
}: NotificationDrawerProps) {
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] transition duration-200 data-closed:opacity-0" />
      <div className="fixed inset-0 flex justify-end">
        <DialogPanel className="flex h-full w-full max-w-md flex-col bg-[#fffefa] shadow-2xl transition duration-300 data-closed:translate-x-full sm:w-[28rem]">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Bell className="h-4 w-4" aria-hidden="true" />
                Updates
              </div>
              <DialogTitle className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Notifications
              </DialogTitle>
              <p className="mt-1 text-sm text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} ${unreadCount === 1 ? "new update" : "new updates"}`
                  : "You’re all caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {notifications.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <ul className="space-y-2" aria-label="Notifications">
                {notifications.map((notification) => {
                  const Icon = notification.icon;

                  return (
                    <li
                      key={notification.id}
                      className={`relative flex gap-3 rounded-2xl px-3 py-3.5 transition hover:bg-slate-50 ${
                        notification.unread ? "bg-primary/[0.045]" : ""
                      }`}
                    >
                      {notification.unread ? (
                        <span className="absolute bottom-0 left-0 top-0 w-1 rounded-l-full bg-primary" aria-hidden="true" />
                      ) : null}
                      <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.accentClassName}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold leading-5 text-slate-800">
                            {notification.title}
                          </p>
                          <time className="shrink-0 pt-0.5 text-xs font-medium text-slate-400">
                            {notification.time}
                          </time>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {notification.detail}
                        </p>
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
              <p className="mt-4 font-semibold text-slate-900">No notifications yet</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">New activity will appear here.</p>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
