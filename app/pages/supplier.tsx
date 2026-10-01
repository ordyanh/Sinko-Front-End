import DashboardLayout from "~/shared/ui/dashboard-layout";
import { supplierDashboardMenuLinks } from "~/shared/lib/dashboard-nav";
import { Outlet } from "react-router";
import { CheckCircle2, Megaphone, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardNotification } from "~/shared/ui";
import {
  getLoggedInUser,
  signInAsDefaultUser,
  type LoggedInUser,
} from "~/shared/lib/indexed-db";

const supplierNotifications: DashboardNotification[] = [
  {
    id: "new-order",
    title: "Blue Lagoon Hotel placed a new order",
    detail: "ORD-9117 · 14 items · $684.00",
    time: "12 min ago",
    icon: ShoppingBag,
    accentClassName: "bg-sky-100 text-sky-700",
    unread: true,
  },
  {
    id: "delivery-confirmed",
    title: "Delivery confirmed for ORD-9101",
    detail: "Blue Lagoon Hotel received the order.",
    time: "1 hr ago",
    icon: CheckCircle2,
    accentClassName: "bg-emerald-100 text-emerald-700",
    unread: true,
  },
  {
    id: "promotion-ending",
    title: "Promotion ending soon",
    detail: "Summer pantry savings ends tomorrow.",
    time: "3 hrs ago",
    icon: Megaphone,
    accentClassName: "bg-amber-100 text-amber-700",
    unread: true,
  },
];

export default function SupplierPage() {
  const [isPreparingDashboard, setIsPreparingDashboard] = useState(true);
  const [authUser, setAuthUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
    let isActive = true;

    async function initSupplierUser() {
      const existingUser = await getLoggedInUser();
      if (!isActive) return;
      if (existingUser && existingUser.role === "supplier") {
        setAuthUser(existingUser);
        setIsPreparingDashboard(false);
        return;
      }

      const user = await signInAsDefaultUser("supplier");
      if (!isActive) return;
      setAuthUser(user);
      setIsPreparingDashboard(false);
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
      notifications={supplierNotifications}
    >
      <Outlet />
    </DashboardLayout>
  );
}
