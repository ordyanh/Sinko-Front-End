import { z } from "zod";

export type ManagedEmployee = {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  phoneNumber?: string;
  status: "Active" | "On vacation";
  vacationStartDate?: string;
  vacationEndDate?: string;
};

export type EmployeeCompanyType = "horeca" | "supplier";

export const yerevanRegionOptions = [
  "Ajapnyak",
  "Arabkir",
  "Avan",
  "Davtashen",
  "Erebuni",
  "Kanaker-Zeytun",
  "Kentron",
  "Malatia-Sebastia",
  "Nork-Marash",
  "Nor Nork",
  "Nubarashen",
  "Shengavit",
] as const;

export const supplierEmployeeRoleOptions = [
  "Courier",
  "Sales Manager",
  "Warehouse Manager",
] as const;

export const employeeFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  phoneNumber: z.string().trim().max(30, "Phone number is too long.").optional(),
  role: z.string().trim().min(1, "Role is required."),
  location: z.string().trim().min(1, "Location is required."),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const vacationFormSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
  })
  .refine(({ startDate, endDate }) => endDate >= startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export type VacationFormValues = z.infer<typeof vacationFormSchema>;

export function getEmployeeFormDefaults(employee?: ManagedEmployee): EmployeeFormValues {
  const nameParts = employee?.name.trim().split(/\s+/) ?? [];
  const [firstName = "", ...lastNameParts] = nameParts;

  return {
    firstName,
    lastName: lastNameParts.join(" "),
    email: employee?.email ?? "",
    phoneNumber: employee?.phoneNumber ?? "",
    role: employee?.role ?? "",
    location: employee?.location ?? "",
  };
}
