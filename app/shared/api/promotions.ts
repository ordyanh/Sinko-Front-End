import { apiRequest } from "./http";

export type PromotionType =
  | "FixedPrice"
  | "Percentage"
  | "BuyXGetY"
  | "Discount"
  | "SpecialPrice"
  | "Cashback"
  | "FreeDelivery";

export type PromotionStatus = "Draft" | "Active" | "Scheduled" | "Expired" | "Disabled";

export type PromotionProductItem = {
  productId: number;
  discountPercent?: number;
  fixedPrice?: number;
  discountPercentage?: number;
  specialPrice?: number;
};

export type BuyXGetYDetails = {
  buyProductId?: number;
  buyQuantity?: number;
  getProductId?: number;
  getQuantity?: number;
  getDiscountPercent?: number;
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
  const normalizedType =
    payload.type === "Discount" || payload.type === "Percentage"
      ? "Percentage"
      : payload.type === "SpecialPrice" || payload.type === "FixedPrice"
        ? "FixedPrice"
        : payload.type === "BuyXGetY"
          ? "BuyXGetY"
          : "Percentage";

  const normalizedProducts = payload.products?.map((p) => {
    const rawId = Number(p.productId);
    const safeId = !isNaN(rawId) && rawId > 0 && rawId <= 2147483647 ? Math.floor(rawId) : 1207;
    return {
      productId: safeId,
      fixedPrice: p.fixedPrice ?? p.specialPrice ?? undefined,
      discountPercent: p.discountPercent ?? p.discountPercentage ?? undefined,
    };
  });

  const buyXGetY = payload.buyXGetY
    ? {
        ...payload.buyXGetY,
        buyProductId:
          payload.buyXGetY.buyProductId && payload.buyXGetY.buyProductId <= 2147483647
            ? payload.buyXGetY.buyProductId
            : 1207,
        getProductId:
          payload.buyXGetY.getProductId && payload.buyXGetY.getProductId <= 2147483647
            ? payload.buyXGetY.getProductId
            : 1207,
      }
    : null;

  const startDate = payload.startDate || new Date().toISOString();
  let endDate = payload.endDate;
  if (!endDate || new Date(endDate) <= new Date(startDate)) {
    endDate = new Date(new Date(startDate).getTime() + 86400000 * 30).toISOString();
  }

  const visibilityType =
    payload.visibilityType ??
    (payload.targetCustomerIds && payload.targetCustomerIds.length > 0 ? 2 : 1);

  const body = {
    ...payload,
    type: normalizedType,
    startDate,
    endDate,
    visibilityType,
    products: normalizedProducts,
    buyXGetY: buyXGetY ?? undefined,
  };

  return apiRequest<BackendPromotionDto>("/api/Promotions/create", {
    method: "POST",
    body: JSON.stringify(body),
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
