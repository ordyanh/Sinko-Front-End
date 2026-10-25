import type { DashboardMenuLink } from "~/shared/ui/dashboard-layout";
import { settingsSections } from "~/shared/lib/settings-sections";

function getSettingsSubmenuLinks(basePath: string) {
  return settingsSections.map((section) => ({
    label: section.label,
    href: `${basePath}/${section.id}`,
  }));
}

export const supplierDashboardMenuLinks: DashboardMenuLink[] = [
  { label: "Dashboard", href: "/supplier", end: true },
  { label: "Orders", href: "/supplier/orders" },
  { label: "Products", href: "/supplier/products" },
  { label: "Customers", href: "/supplier/customers" },
  {
    label: "Employees",
    href: "/supplier/employees",
    title: "Employees",
    description:
      "Add team members, assign responsibilities, and manage employee access across dashboard modules.",
  },
  { label: "Promotions", href: "/supplier/promotions" },
  {
    label: "Settings",
    href: "/supplier/settings",
    submenuLinks: [
      ...getSettingsSubmenuLinks("/supplier/settings").slice(0, 1),
      { label: "Supplier profile", href: "/supplier/settings/supplier-profile" },
      ...getSettingsSubmenuLinks("/supplier/settings").slice(1),
    ],
  },
];

export function getFilteredSupplierMenuLinks(role?: string | null): DashboardMenuLink[] {
  if (!role || role === "Admin" || role === "SuperAdmin") {
    return supplierDashboardMenuLinks;
  }
  if (role === "SalesManager") {
    return supplierDashboardMenuLinks.filter((link) =>
      ["Orders", "Products", "Customers"].includes(link.label)
    );
  }
  if (role === "WarehouseManager") {
    return supplierDashboardMenuLinks.filter((link) =>
      ["Orders"].includes(link.label)
    );
  }
  if (role === "DeliveryManager") {
    return supplierDashboardMenuLinks.filter((link) =>
      ["Orders"].includes(link.label)
    );
  }
  if (role === "Accountant" || role === "FinanceManager") {
    return supplierDashboardMenuLinks.filter((link) =>
      ["Dashboard", "Orders", "Customers"].includes(link.label)
    );
  }
  if (role === "CustomerSupport") {
    return supplierDashboardMenuLinks.filter((link) =>
      ["Orders", "Products", "Customers", "Promotions"].includes(link.label)
    );
  }
  return supplierDashboardMenuLinks.filter((link) => link.label === "Orders");
}

export const horecaDashboardMenuLinks: DashboardMenuLink[] = [
  { label: "Dashboard", href: "/horeca", end: true },
  { label: "Products", href: "/horeca/products" },
  { label: "Suppliers", href: "/horeca/suppliers" },
  { label: "Orders", href: "/horeca/orders" },
  {
    label: "Employees",
    href: "/horeca/employees",
    title: "Employees",
    description:
      "Add team members, assign responsibilities, and manage employee access across dashboard modules.",
  },
  { label: "Promotions", href: "/horeca/promotions" },
  {
    label: "Settings",
    href: "/horeca/settings",
    submenuLinks: getSettingsSubmenuLinks("/horeca/settings"),
  },
];
