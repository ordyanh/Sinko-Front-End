import { z } from "zod";
import type { CompanyType } from "~/entities/company/models/company";
export const EmployeeRole = {
  Admin: "Admin",
  Courier: "Courier",
  SalesManager: "SalesManager",
  PurchasingEmployee: "PurchasingEmployee",
  WarehouseManager: "WarehouseManager",
} as const;

export type EmployeeRole = (typeof EmployeeRole)[keyof typeof EmployeeRole];

export const baseEmployeeRoleValues = Object.values(
  EmployeeRole,
) as readonly EmployeeRole[];

export type BaseEmployeeRole = (typeof baseEmployeeRoleValues)[number];

export const baseEmployeeRoleLabels: Record<BaseEmployeeRole, string> = {
  Admin: "Admin",
  Courier: "Courier",
  SalesManager: "Sales Manager",
  PurchasingEmployee: "Purchasing Employee",
  WarehouseManager: "Warehouse Manager",
};

export type BaseEmployeeStatus =
  "Active" | "OnVacation" | "DayOff" | "Disabled" | "Removed";

export type BaseEmployee<TCompany extends CompanyType, TRole extends string> = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  regionIds: number[];
  regionNames: string[];
  companyType: TCompany;
  role: TRole;
};

export const employeeFormFields = {
  employeeName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
};

export const horecaEmployeeFormSchema = z.object({
  ...employeeFormFields,
  role: z.literal("PurchasingEmployee"),
});

export type HorecaEmployeeFormValues = z.infer<typeof horecaEmployeeFormSchema>;
