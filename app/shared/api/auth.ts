import { apiRequest } from "./http";

export type ActivityType = 1 | 2 | 3 | 4;
export type UserRole = "Client" | "Supplier";

export type RegisterRequest = {
  companyName?: string | null;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  taxCode?: string | null;
  role?: UserRole;
  password?: string | null;
  confirmPassword?: string | null;
  categoryIds?: number[] | null;
  typeOfActivity?: string | null;
  serviceAreaIds?: number[] | null;
  customServiceAreas?: string[] | null;
  manualRegions?: string[] | null;
};

export type LoginRequest = {
  email?: string | null;
  password?: string | null;
};

export type LoginResponse = {
  token?: string;
  Token?: string;
  accessToken?: string;
  AccessToken?: string;
  role?: string;
  Role?: string;
  userId?: string;
  UserId?: string;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  username?: string;
  Username?: string;
  accountType?: string;
  AccountType?: string;
  organizationId?: string;
  OrganizationId?: string;
  userRole?: string;
  UserRole?: string;
  permissions?: string[];
  Permissions?: string[];
  accessibleModules?: string[];
  AccessibleModules?: string[];
  assignedServiceAreas?: string[];
  AssignedServiceAreas?: string[];
  companyId?: string;
  CompanyId?: string;
  companyName?: string;
  CompanyName?: string;
  businessType?: string;
  BusinessType?: string;
  email?: string;
  Email?: string;
  hasCompletedOnboarding?: boolean;
  HasCompletedOnboarding?: boolean;
  message?: string;
  Message?: string;
  requiresPasswordReset?: boolean;
  RequiresPasswordReset?: boolean;
};

export type ConfirmEmailRequest = {
  email?: string | null;
  code?: string | null;
};

export type ChangePasswordRequest = {
  oldPassword?: string | null;
  newPassword?: string | null;
};

export type ForgotPasswordRequest = {
  email?: string | null;
};

export type ResetPasswordWithCodeRequest = {
  email?: string | null;
  code?: string | null;
  newPassword?: string | null;
};

export type SupplierRegistrationRequest = {
  companyName: string;
  email: string;
  phoneNumber: string;
  address: string;
  taxCode: string;
  password?: string | null;
  categoryIds: number[];
  serviceAreaIds?: number[] | null;
  customServiceAreas?: string[] | null;
};

export type SupplierRegistrationResponse = {
  supplierId: string;
  email: string;
  status: string;
  message: string;
};

export type SupplierVerificationRequest = {
  supplierId?: string | null;
  email?: string | null;
  verificationCode?: string | null;
  code?: string | null;
};

export type SupplierResendCodeRequest = {
  email?: string | null;
};

export type SubmitVerificationRequest = {
  companyName?: string | null;
  registrationNumber?: string | null;
  documents?: string[] | null;
};

export type EmployeeRole =
  | "Admin"
  | "Courier"
  | "SalesManager"
  | "PurchasingEmployee"
  | "WarehouseManager";

export type EmployeeStatus =
  | "Active"
  | "OnVacation"
  | "DayOff"
  | "Disabled"
  | "Removed";

export type CreateEmployeeRequest = {
  employeeName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  role?: EmployeeRole;
  regionIds?: number[] | null;
};

export type UpdateEmployeeRequest = {
  employeeId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  statusStartDate?: string | null;
  statusEndDate?: string | null;
};

export async function registerUser(payload: RegisterRequest) {
  return apiRequest<void>("/api/Auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/Auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAuthMe() {
  return apiRequest<unknown>("/api/Auth/me", {
    method: "GET",
  });
}

export async function logoutUser() {
  return apiRequest<void>("/api/Auth/logout", {
    method: "POST",
  });
}

export async function changePassword(payload: ChangePasswordRequest) {
  return apiRequest<void>("/api/Auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
  return apiRequest<void>("/api/Auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: ResetPasswordWithCodeRequest) {
  return apiRequest<void>("/api/Auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmEmail(payload: ConfirmEmailRequest) {
  return apiRequest<void>("/api/Auth/confirm-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendConfirmationCode(email: string) {
  const query = new URLSearchParams({ email });
  return apiRequest<void>(`/api/Auth/resend-code?${query.toString()}`, {
    method: "POST",
  });
}

export async function registerSupplier(
  payload: SupplierRegistrationRequest,
): Promise<SupplierRegistrationResponse> {
  return apiRequest<SupplierRegistrationResponse>("/api/supplier/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifySupplier(payload: SupplierVerificationRequest) {
  const body = {
    ...payload,
    verificationCode: payload.verificationCode ?? payload.code,
  };
  return apiRequest<void>("/api/supplier/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function resendSupplierCode(payload: SupplierResendCodeRequest) {
  return apiRequest<void>("/api/Auth/supplier/resend-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitVerificationRequest(payload: SubmitVerificationRequest) {
  return apiRequest<void>("/api/Auth/verification-request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeOnboarding() {
  return apiRequest<void>("/api/Auth/complete-onboarding", {
    method: "POST",
  });
}

export async function getEmployees() {
  return apiRequest<unknown>("/api/Employee/list", {
    method: "GET",
  });
}

export async function addEmployee(payload: CreateEmployeeRequest) {
  return apiRequest<unknown>("/api/Auth/add-employee", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEmployeeById(
  employeeId: string,
  payload: UpdateEmployeeRequest,
) {
  return apiRequest<unknown>(`/api/Employee/${employeeId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export const mockApiRequest = (success = true) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({ success: true });
      } else {
        reject({ success: false });
      }
    }, 1000);
  });
};
