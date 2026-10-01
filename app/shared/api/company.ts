import { apiRequest } from "./http";

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
  categoryIds?: number[];
  serviceAreaIds?: number[];
  customServiceAreas?: string[];
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

export type RequestEmailChangeDto = {
  newEmail?: string | null;
};

export type VerifyEmailChangeDto = {
  newEmail?: string | null;
  code?: string | null;
};

export type ResendEmailChangeDto = {
  newEmail?: string | null;
};

export type RequestHvhhChangeDto = {
  newHvhh?: string | null;
  reason?: string | null;
};

export type UpdateLanguageDto = {
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

export async function updateCompany(payload: UpdateCompanyRequest): Promise<void> {
  return apiRequest<void>("/api/Company", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function requestCompanyChange(payload: UpdateCompanyRequest): Promise<void> {
  return apiRequest<void>("/api/Company/change-request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestEmailChange(payload: RequestEmailChangeDto): Promise<void> {
  return apiRequest<void>("/api/Company/change-email/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmailChange(payload: VerifyEmailChangeDto): Promise<void> {
  return apiRequest<void>("/api/Company/change-email/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendEmailChange(payload: ResendEmailChangeDto): Promise<void> {
  return apiRequest<void>("/api/Company/change-email/resend", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestHvhhChange(payload: RequestHvhhChangeDto): Promise<void> {
  return apiRequest<void>("/api/Company/change-hvhh/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyLanguage(payload: UpdateLanguageDto): Promise<void> {
  return apiRequest<void>("/api/Company/language", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
