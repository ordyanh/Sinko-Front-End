import { apiRequest } from "./http";

export type MarketplaceSupplierDto = {
  id: string;
  companyName: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  serviceArea?: string;
  description?: string;
  categoryIds?: number[];
  productCategories?: string[];
  rating?: number;
  productCount?: number;
  logoUrl?: string | null;
};

export type MarketplaceSupplierDetailsDto = MarketplaceSupplierDto & {
  supplier: MarketplaceSupplierDto;
  categories?: Array<{ id: number; name: string; productCount?: number }>;
  products?: MarketplaceProductDto[];
  promotions?: any[];
};

export type MarketplaceProductDto = {
  productId: number;
  id?: number | string;
  code: string;
  productName: string;
  name?: string;
  imageUrl?: string | null;
  image?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  category?: string | null;
  supplierId: string;
  supplierName: string;
  supplier?: string;
  price: number;
  standardPrice?: number;
  inStock: boolean;
  availability?: boolean;
  unit: string;
  unitId?: number | null;
  sellingUnitId?: number | null;
  unitDisplay?: string | null;
  sellingUnit?: string | null;
  unitName?: string | null;
  packageOptions?: number[] | string | null;
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

function extractArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.value)) return res.value;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

export async function getMarketplaceSuppliers(): Promise<MarketplaceSupplierDto[]> {
  try {
    const res = await apiRequest<any>("/api/Marketplace/suppliers", {
      method: "GET",
    });
    return extractArray<MarketplaceSupplierDto>(res);
  } catch (error) {
    console.error("Failed to load marketplace suppliers:", error);
    return [];
  }
}

export async function getMarketplaceSupplierById(
  id: string,
): Promise<MarketplaceSupplierDetailsDto | null> {
  try {
    const res = await apiRequest<any>(`/api/Marketplace/suppliers/${id}`, {
      method: "GET",
    });
    if (!res) return null;

    if (res.supplier && typeof res.supplier === "object") {
      const supplierDto: MarketplaceSupplierDto = {
        ...res.supplier,
        address: res.supplier.address || res.supplier.serviceArea,
        serviceArea: res.supplier.serviceArea || res.supplier.address,
      };
      const products = extractArray<MarketplaceProductDto>(res.products);
      const categories = extractArray<{ id: number; name: string; productCount?: number }>(res.categories);
      const promotions = extractArray<any>(res.promotions);

      return {
        ...supplierDto,
        supplier: supplierDto,
        categories,
        products,
        promotions,
      };
    }

    if (res.id || res.companyName) {
      const supplierDto: MarketplaceSupplierDto = {
        ...res,
        address: res.address || res.serviceArea,
        serviceArea: res.serviceArea || res.address,
      };
      return {
        ...supplierDto,
        supplier: supplierDto,
        categories: extractArray(res.categories),
        products: extractArray(res.products),
        promotions: extractArray(res.promotions),
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to load marketplace supplier ${id}:`, error);
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

    const res = await apiRequest<any>(`/api/Marketplace/products${qs}`, {
      method: "GET",
    });
    return extractArray<MarketplaceProductDto>(res);
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
    const res = await apiRequest<any>(
      `/api/Marketplace/products/${id}?langId=${langId}`,
      { method: "GET" },
    );
    if (!res) return null;
    if (res.product && typeof res.product === "object") {
      return { ...res.product, ...res };
    }
    return res as MarketplaceProductDto;
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
