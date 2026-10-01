import { apiRequest } from "./http";
import type { BackendProductDto } from "./products";

export type MarketplaceSupplierDto = {
  id: string;
  companyName: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  description?: string;
  categoryIds?: number[];
  rating?: number;
  productCount?: number;
};

export type MarketplaceStaticInfo = {
  totalSuppliers?: number;
  totalProducts?: number;
  featuredCategories?: number[];
};

export async function getMarketplaceSuppliers(): Promise<MarketplaceSupplierDto[]> {
  try {
    const res = await apiRequest<MarketplaceSupplierDto[]>("/api/Marketplace/suppliers", {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function getMarketplaceSupplierById(
  id: string,
): Promise<MarketplaceSupplierDto | null> {
  try {
    return await apiRequest<MarketplaceSupplierDto>(`/api/Marketplace/suppliers/${id}`, {
      method: "GET",
    });
  } catch {
    return null;
  }
}

export async function getMarketplaceProducts(params?: {
  categoryId?: number;
  supplierId?: string;
  search?: string;
}): Promise<BackendProductDto[]> {
  try {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", String(params.categoryId));
    if (params?.supplierId) query.set("supplierId", params.supplierId);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";

    const res = await apiRequest<BackendProductDto[]>(`/api/Marketplace/products${qs}`, {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function getMarketplaceStaticInfo(): Promise<MarketplaceStaticInfo | null> {
  try {
    return await apiRequest<MarketplaceStaticInfo>("/api/Marketplace/static-info", {
      method: "GET",
    });
  } catch {
    return null;
  }
}
