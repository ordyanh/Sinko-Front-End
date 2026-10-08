import DashboardLayout from "~/shared/ui/dashboard-layout";
import { supplierDashboardMenuLinks } from "~/shared/lib/dashboard-nav";
import { Outlet, useNavigate } from "react-router";
import { CheckCircle2, Megaphone, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardNotification } from "~/shared/ui";
import { getNotifications } from "~/shared/api";
import {
  getLoggedInUser,
  type LoggedInUser,
} from "~/shared/lib/indexed-db";

const defaultSupplierNotifications: DashboardNotification[] = [];

export default function SupplierPage() {
  const navigate = useNavigate();
  const [isPreparingDashboard, setIsPreparingDashboard] = useState(true);
  const [authUser, setAuthUser] = useState<LoggedInUser | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  useEffect(() => {
    let isActive = true;

    async function initSupplierUser() {
      const existingUser = await getLoggedInUser();
      if (!isActive) return;
      if (existingUser && existingUser.role === "supplier") {
        setAuthUser(existingUser);
        setIsPreparingDashboard(false);
      } else {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const notifs = await getNotifications();
        if (Array.isArray(notifs) && notifs.length > 0 && isActive) {
          setNotifications(
            notifs.map((n) => ({
              id: n.id,
              title: n.title,
              detail: n.message,
              time: new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
              icon: n.title.toLowerCase().includes("order") ? ShoppingBag : CheckCircle2,
              accentClassName: n.isRead ? "bg-slate-100 text-slate-700" : "bg-sky-100 text-sky-700",
              unread: !n.isRead,
            })),
          );
        }
      } catch {
        // fallback
      }
    }

    void initSupplierUser();

    return () => {
      isActive = false;
    };
  }, []);

  if (isPreparingDashboard) {
    return null;
  }

  return (
    <DashboardLayout
      accountType="supplier"
      menuLinks={supplierDashboardMenuLinks}
      userName={authUser?.displayName ?? ""}
      companyName={authUser?.companyName ?? ""}
      logoutHref="/logout"
      notifications={notifications}
    >
      <Outlet />
    </DashboardLayout>
  );
}
