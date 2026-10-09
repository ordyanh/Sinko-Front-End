export type RegistrationFormValues = {
  companyName: string;
  email: string;
  mobile: string;
  address: string;
  taxCode: string;
  password: string;
  confirmPassword: string;
  activityType: number | string;
  categoryIds: number[];
  otherActivityType?: string;
};

export function getRegistrationFormValues(
  formData: FormData,
): RegistrationFormValues {
  const activityTypeRaw = String(formData.get("activityType") ?? "").trim();
  const activityTypeNumber = Number(activityTypeRaw);
  const activityType =
    activityTypeRaw &&
    Number.isInteger(activityTypeNumber) &&
    activityTypeNumber > 0
      ? activityTypeNumber
      : activityTypeRaw;
  const categoryIdsRaw = String(formData.get("categoryIds") ?? "");
  const categoryIds = categoryIdsRaw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return {
    companyName: String(formData.get("companyName") ?? ""),
    email: String(formData.get("email") ?? ""),
    mobile: String(formData.get("mobile") ?? formData.get("phoneNumber") ?? ""),
    address: String(formData.get("address") ?? ""),
    taxCode: String(formData.get("taxCode") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    activityType,
    categoryIds,
    otherActivityType: String(formData.get("otherActivityType") ?? ""),
  };
}
