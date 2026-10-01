import { apiRequest } from "./http";

export type SaveSupplierProfileRequest = {
  description?: string | null;
  categoryIds?: number[] | null;
};

export type SupplierProfileDto = {
  accountId?: string;
  description?: string;
  categoryIds?: number[];
  categories?: Array<{ id: number; name: string }>;
  verified?: boolean;
};

export async function getSupplierProfile(): Promise<SupplierProfileDto | null> {
  try {
    return await apiRequest<SupplierProfileDto>("/api/supplier/profile", {
      method: "GET",
    });
  } catch {
    return null;
  }
}

export async function saveSupplierProfile(
  payload: SaveSupplierProfileRequest,
): Promise<void> {
  try {
    await apiRequest<void>("/api/supplier/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    await apiRequest<void>("/api/Supplier/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
