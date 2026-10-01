import { z } from "zod";
import { employeeFormFields } from "~/entities/employee/model/employee";

export const supplierEmployeeFormSchema = z.object({
  phoneNumber: employeeFormFields.phoneNumber,
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  role: z.enum(["Admin", "Courier", "SalesManager", "WarehouseManager"]),
  regionIds: z.array(z.number().int()).nullable().optional(),
});

export type SupplierEmployeeFormValues = z.infer<
  typeof supplierEmployeeFormSchema
>;
