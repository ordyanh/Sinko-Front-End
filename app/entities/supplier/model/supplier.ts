import { z } from "zod";
import {
  baseEmployeeRoleLabels,
  type BaseEmployee,
  type BaseEmployeeRole,
} from "~/entities/employee";
import type {
  ActivityType,
  RegisterRequest,
  SupplierRegistrationRequest,
  UserRole,
} from "~/shared/api";

export const supplierRole: UserRole = "Supplier";

export const supplierActivityOptions: Array<{
  value: ActivityType;
  label: string;
}> = [
  { value: 1, label: "Hotel" },
  { value: 2, label: "Restaurant" },
  { value: 3, label: "Cafe" },
  { value: 4, label: "Other" },
];

export const supplierRegistrationSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required."),
    email: z
      .string()
      .min(1, "Email is required.")
      .email("Enter a valid email address."),
    mobile: z
      .string()
      .min(1, "Mobile number is required.")
      .regex(/^\+?[0-9()\-\s]{7,20}$/, "Enter a valid phone number."),
    address: z.string().min(1, "Address is required."),
    taxCode: z
      .string()
      .min(1, "Tax code is required.")
      .regex(/^\d{8,10}$/, "Enter a valid tax code (8-10 digits)."),
    categoryIds: z
      .array(z.number().int().positive())
      .min(1, "Select at least one product category."),
    otherActivityType: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SupplierRegistrationValues = z.infer<
  typeof supplierRegistrationSchema
>;

export type SupplierEmployeeRole = Exclude<
  BaseEmployeeRole,
  "PurchasingEmployee"
>;

export const supplierEmployeeRoleValues = [
  "Admin",
  "Courier",
  "SalesManager",
  "WarehouseManager",
] as const satisfies readonly SupplierEmployeeRole[];

export const supplierEmployeeRoleLabels: Record<SupplierEmployeeRole, string> =
  {
    Admin: baseEmployeeRoleLabels.Admin,
    Courier: baseEmployeeRoleLabels.Courier,
    SalesManager: baseEmployeeRoleLabels.SalesManager,
    WarehouseManager: baseEmployeeRoleLabels.WarehouseManager,
  };

export type SupplierEmployee = BaseEmployee<"Supplier", SupplierEmployeeRole>;

export function toSupplierRegisterRequest(
  values: SupplierRegistrationValues,
): SupplierRegistrationRequest {
  const categoryIds = values.categoryIds ?? [];

  return {
    companyName: values.companyName.trim(),
    email: values.email.trim(),
    phoneNumber: values.mobile.trim(),
    address: values.address.trim(),
    taxCode: values.taxCode.trim(),
    password: values.password,
    categoryIds: categoryIds.length > 0 ? categoryIds : [],
    serviceAreaIds: [],
    customServiceAreas: [],
  };
}
