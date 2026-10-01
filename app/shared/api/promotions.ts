import { apiRequest } from "./http";

export type PromotionType =
  | "Discount"
  | "BuyXGetY"
  | "SpecialPrice"
  | "Cashback"
  | "FreeDelivery";

export type PromotionStatus = "Draft" | "Active" | "Scheduled" | "Expired" | "Disabled";

export type PromotionProductItem = {
  productId: number;
  discountPercentage?: number;
  specialPrice?: number;
};

export type BuyXGetYDetails = {
  buyProductId?: number;
  buyQuantity?: number;
  getProductId?: number;
  getQuantity?: number;
};

export type CreatePromotionRequest = {
  name: string;
  description?: string | null;
  type: PromotionType;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  applyOnIndividualPricing?: boolean;
  visibilityType?: number;
  maxPromotionQuantity?: number | null;
  bannerEnabled?: boolean;
  discoveryLocation?: string | null;
  bannerImageUrl?: string | null;
  brandColorFallback?: string | null;
  targetCustomerIds?: string[] | null;
  products?: PromotionProductItem[] | null;
  buyXGetY?: BuyXGetYDetails | null;
};

export type BackendPromotionDto = {
  id: string;
  name: string;
  description?: string;
  type: PromotionType;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  bannerImageUrl?: string;
  brandColorFallback?: string;
  targetCustomerIds?: string[];
  products?: PromotionProductItem[];
  supplierId?: string;
  supplierName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PromotionStatsDto = {
  totalPromotions: number;
  activePromotions: number;
  totalOrdersWithPromotion: number;
  totalDiscountGiven: number;
};

export async function getSupplierPromotions(): Promise<BackendPromotionDto[]> {
  try {
    const res = await apiRequest<BackendPromotionDto[]>("/api/Promotions/get-promotions", {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch {
    const fallback = await apiRequest<BackendPromotionDto[]>("/api/Promotions", {
      method: "GET",
    });
    return Array.isArray(fallback) ? fallback : [];
  }
}

export async function getPromotionById(id: string): Promise<BackendPromotionDto> {
  return apiRequest<BackendPromotionDto>(`/api/Promotions/${id}`, {
    method: "GET",
  });
}

export async function createPromotion(
  payload: CreatePromotionRequest,
): Promise<BackendPromotionDto> {
  return apiRequest<BackendPromotionDto>("/api/Promotions/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function duplicatePromotion(id: string): Promise<BackendPromotionDto> {
  return apiRequest<BackendPromotionDto>(`/api/Promotions/${id}/duplicate`, {
    method: "POST",
  });
}

export async function disablePromotion(id: string): Promise<void> {
  return apiRequest<void>(`/api/Promotions/${id}/disable`, {
    method: "POST",
  });
}

export async function getTargetCustomers(): Promise<Array<{ id: string; name: string }>> {
  const res = await apiRequest<Array<{ id: string; name: string }>>(
    "/api/Promotions/target-customers",
    { method: "GET" },
  );
  return Array.isArray(res) ? res : [];
}

export async function getActivePromotions(): Promise<BackendPromotionDto[]> {
  const res = await apiRequest<BackendPromotionDto[]>("/api/Promotions/active", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function getMarketplacePromotions(): Promise<BackendPromotionDto[]> {
  const res = await apiRequest<BackendPromotionDto[]>("/api/Promotions/marketplace", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function getAvailableOffers(): Promise<unknown[]> {
  const res = await apiRequest<unknown[]>("/api/Promotions/get-available-offers", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function getPromotionSupplierStats(): Promise<PromotionStatsDto> {
  return apiRequest<PromotionStatsDto>("/api/Promotions/supplier-stats", {
    method: "GET",
  });
}

export async function calculatePromotion(payload: unknown): Promise<unknown> {
  try {
    const params = new URLSearchParams();
    if (payload && typeof payload === "object") {
      for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
        if (v !== undefined && v !== null) {
          params.set(k, String(v));
        }
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest<unknown>(`/api/Promotions/calculate${qs}`, {
      method: "GET",
    });
  } catch {
    return await apiRequest<unknown>("/api/Promotions/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
