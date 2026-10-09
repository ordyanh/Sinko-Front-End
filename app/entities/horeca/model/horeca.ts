import { z } from "zod";
import {
  baseEmployeeRoleLabels,
  type BaseEmployee,
  type BaseEmployeeRole,
} from "~/entities/employee";
import type { RegisterRequest, UserRole } from "~/shared/api";

export const horecaRole: UserRole = "Client";

export const horecaActivityTypeValues = [
  "Hotel",
  "Restaurant",
  "Cafe",
  "Other",
] as const;

export type HorecaActivityType = (typeof horecaActivityTypeValues)[number];

export const horecaActivityOptions: Array<{
  value: HorecaActivityType;
  label: string;
}> = [
  { value: "Hotel", label: "Hotel" },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Cafe", label: "Cafe" },
  { value: "Other", label: "Other" },
];

export const horecaRegistrationSchema = z
  .object({
    companyName: z.string().min(1, "Organization name is required."),
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
      .regex(/^[0-9A-Za-z-]{6,20}$/, "Enter a valid tax code."),
    activityType: z.enum(horecaActivityTypeValues, {
      error: "Type of activity is required.",
    }),
    otherActivityType: z
      .string()
      .optional()
      .transform((value) => value?.trim() ?? ""),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .superRefine((data, ctx) => {
    if (data.activityType !== "Other") {
      return;
    }

    if (!data.otherActivityType) {
      ctx.addIssue({
        code: "custom",
        path: ["otherActivityType"],
        message: "Describe your type of activity.",
      });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type HorecaRegistrationValues = z.infer<typeof horecaRegistrationSchema>;
export type HorecaRegistrationFormValues = z.input<
  typeof horecaRegistrationSchema
>;

export type HorecaEmployeeRole = Extract<
  BaseEmployeeRole,
  "PurchasingEmployee"
>;

export const horecaEmployeeRoleValues = [
  "PurchasingEmployee",
] as const satisfies readonly HorecaEmployeeRole[];

export const horecaEmployeeRoleLabels: Record<HorecaEmployeeRole, string> = {
  PurchasingEmployee: baseEmployeeRoleLabels.PurchasingEmployee,
};

export type HorecaEmployee = BaseEmployee<"Horeca", HorecaEmployeeRole>;

export function toHorecaRegisterRequest(
  values: HorecaRegistrationValues,
): RegisterRequest {
  const activityType = values.activityType;
  const customActivity = values.otherActivityType;

  return {
    companyName: values.companyName.trim(),
    email: values.email.trim(),
    phoneNumber: values.mobile.trim(),
    mobile: values.mobile.trim(),
    address: values.address.trim(),
    taxCode: values.taxCode.trim(),
    password: values.password,
    confirmPassword: values.confirmPassword,
    role: horecaRole,
    typeOfActivity:
      activityType === "Other" ? (customActivity ?? "") : activityType,
  };
}
