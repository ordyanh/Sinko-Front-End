import { apiRequest } from "./http";

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

export type MarketplaceProductDto = {
  productId: number;
  code: string;
  productName: string;
  imageUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  supplierId: string;
  supplierName: string;
  price: number;
  inStock: boolean;
  unit: string;
  unitId?: number | null;
  unitDisplay?: string | null;
  unitName?: string | null;
  packageOptions?: number[] | null;
  packaging?: string | null;
  description?: string | null;
};

export type MarketplaceProductFilter = {
  query?: string;
  search?: string;
  supplierId?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  langId?: number;
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

export async function getMarketplaceProducts(
  params?: MarketplaceProductFilter,
): Promise<MarketplaceProductDto[]> {
  try {
    const query = new URLSearchParams();
    const searchTerm = params?.query || params?.search;
    if (searchTerm) query.set("Query", searchTerm);
    if (params?.supplierId) query.set("SupplierId", params.supplierId);
    if (params?.categoryId != null) query.set("CategoryId", String(params.categoryId));
    if (params?.minPrice != null) query.set("MinPrice", String(params.minPrice));
    if (params?.maxPrice != null) query.set("MaxPrice", String(params.maxPrice));
    if (params?.inStock != null) query.set("InStock", String(params.inStock));
    if (params?.langId != null) query.set("langId", String(params.langId));
    const qs = query.toString() ? `?${query.toString()}` : "";

    const res = await apiRequest<MarketplaceProductDto[]>(`/api/Marketplace/products${qs}`, {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error("Failed to load marketplace products:", error);
    return [];
  }
}

export async function getMarketplaceProductById(
  id: string | number,
  langId: number = 1,
): Promise<MarketplaceProductDto | null> {
  try {
    return await apiRequest<MarketplaceProductDto>(
      `/api/Marketplace/products/${id}?langId=${langId}`,
      { method: "GET" },
    );
  } catch (error) {
    console.error(`Failed to load marketplace product ${id}:`, error);
    return null;
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
