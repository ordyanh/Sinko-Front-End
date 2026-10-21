import { apiRequest } from "./http";

export type CompanyCategoryDto = {
  id: number;
  name: string;
};

export type CompanyServiceAreaDto = {
  id: number;
  name: string;
  province?: string;
  isCustom?: boolean;
};

export type CompanyDeliveryAddressDto = {
  id: string;
  label?: string;
  fullAddress: string;
  contactPerson?: string;
  contactPhone?: string;
  active: boolean;
  approved: boolean;
};

export type CompanyInfoDto = {
  id?: string;
  companyName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  taxCode?: string;
  hvhh?: string;
  typeOfActivity?: string;
  description?: string;
  languageCode?: string;
  subscriptionPlan?: string;
  maxEmployees?: number;
  updateCount24h?: number;
  productCategories?: CompanyCategoryDto[];
  serviceAreas?: CompanyServiceAreaDto[];
  customServiceAreas?: string[];
  deliveryAddresses?: CompanyDeliveryAddressDto[];
  categoryIds?: number[];
  serviceAreaIds?: number[];
  manualRegions?: string[];
  language?: string;
  verified?: boolean;
};

export type UpdateCompanyRequest = {
  phoneNumber?: string | null;
  address?: string | null;
  companyName?: string | null;
  typeOfActivity?: string | null;
  description?: string | null;
  categoryIds?: number[] | null;
  serviceAreaIds?: number[] | null;
  customServiceAreas?: string[] | null;
  manualRegions?: string[] | null;
};

export type UpdateCompanyResponse = {
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
};

export type RequestEmailChangeDto = {
  newEmail?: string | null;
};

export type VerifyEmailChangeDto = {
  newEmail?: string | null;
  code?: string | null;
};

export type ResendEmailChangeDto = {
  email?: string | null;
  newEmail?: string | null;
};

export type RequestHvhhChangeDto = {
  newHvhh?: string | null;
  reason?: string | null;
};

export type UpdateLanguageDto = {
  languageCode?: string | null;
  language?: string | null;
};

export async function getCompanyInfo(): Promise<CompanyInfoDto> {
  return apiRequest<CompanyInfoDto>("/api/Company/info", {
    method: "GET",
  });
}

export async function getCompany(): Promise<CompanyInfoDto> {
  return apiRequest<CompanyInfoDto>("/api/Company", {
    method: "GET",
  });
}

export async function updateCompany(payload: UpdateCompanyRequest): Promise<UpdateCompanyResponse> {
  return apiRequest<UpdateCompanyResponse>("/api/Company", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function requestCompanyChange(payload: UpdateCompanyRequest): Promise<UpdateCompanyResponse> {
  return apiRequest<UpdateCompanyResponse>("/api/Company/change-request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestEmailChange(payload: RequestEmailChangeDto): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/api/Company/change-email/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmailChange(payload: VerifyEmailChangeDto): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/api/Company/change-email/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendEmailChange(payload?: ResendEmailChangeDto): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/api/Company/change-email/resend", {
    method: "POST",
    body: JSON.stringify({
      email: payload?.email || payload?.newEmail,
    }),
  });
}

export async function requestHvhhChange(payload: RequestHvhhChangeDto): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/api/Company/change-hvhh/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyLanguage(payload: UpdateLanguageDto): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/api/Company/language", {
    method: "POST",
    body: JSON.stringify({
      languageCode: payload.languageCode || payload.language,
    }),
  });
}