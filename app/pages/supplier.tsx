import DashboardLayout from "~/shared/ui/dashboard-layout";
import { supplierDashboardMenuLinks } from "~/shared/lib/dashboard-nav";
import { Outlet, useNavigate } from "react-router";
import { CheckCircle2, Megaphone, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardNotification } from "~/shared/ui";
import { getNotifications, formatNotificationTime } from "~/shared/api";
import {
  getLoggedInUser,
  type LoggedInUser,
} from "~/shared/lib/indexed-db";

const defaultSupplierNotifications: DashboardNotification[] = [];

export default function SupplierPage() {
  const navigate = useNavigate();
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
      } else {
        navigate("/login", { replace: true });
      }
    }

    void initSupplierUser();

    return () => {
      isActive = false;
    };
  }, [navigate]);

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
    >
      <Outlet />
    </DashboardLayout>
  );
}
