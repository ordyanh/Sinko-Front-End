import DashboardLayout from "~/shared/ui/dashboard-layout";
import { getFilteredSupplierMenuLinks } from "~/shared/lib/dashboard-nav";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  getLoggedInUser,
  type LoggedInUser,
} from "~/shared/lib/indexed-db";

export default function SupplierPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPreparingDashboard, setIsPreparingDashboard] = useState(true);
  const [authUser, setAuthUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
    let isActive = true;

    async function initSupplierUser() {
      const existingUser = await getLoggedInUser();
      if (!isActive) return;
      if (existingUser && existingUser.role === "supplier") {
        const role = existingUser.userRole;
        const pathname = location.pathname.toLowerCase();

        // Enforce role-based route access
        if (role === "WarehouseManager") {
          const isAllowed =
            pathname === "/supplier/orders" ||
            pathname.startsWith("/supplier/orders/") ||
            pathname.startsWith("/supplier/notifications");
          if (!isAllowed) {
            navigate("/supplier/orders", { replace: true });
            return;
          }
        } else if (role === "SalesManager") {
          const forbidden = [
            "/supplier/employees",
            "/supplier/promotions",
            "/supplier/settings",
          ];
          if (forbidden.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
            navigate("/supplier/orders", { replace: true });
            return;
          }
        }

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
  }, [navigate, location.pathname]);

  if (isPreparingDashboard) {
    return null;
  }

  const menuLinks = getFilteredSupplierMenuLinks(authUser?.userRole);

  return (
    <DashboardLayout
      accountType="supplier"
      menuLinks={menuLinks}
      userName={authUser?.displayName ?? ""}
      companyName={authUser?.companyName ?? ""}
      logoutHref="/logout"
    >
      <Outlet />
    </DashboardLayout>
  );
}
