import { apiRequest } from "./http";

export type CustomerClientDto = {
  id: string;
  clientId?: string;
  restaurantId?: string;
  companyName: string;
  restaurantName?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
  serviceAreas?: Array<{
    id: number;
    name: string;
    province?: string;
    isCustom?: boolean;
    lat?: number | null;
    lon?: number | null;
  }>;
  hvhh?: string;
  taxCode?: string;
  totalOrders?: number;
  totalOrdersCount?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  status?: string;
  completedOrders?: any[];
};

export type DeliveryPointRequest = {
  provinceId?: number;
  cityId?: number;
  customRegion?: string | null;
  regionName?: string | null;
  region?: string | null;
  deliveryAddress: string;
  phoneNumber: string;
  pointName?: string | null;
  lat?: number | null;
  lon?: number | null;
};

export type DailySummaryDto = {
  date?: string;
  totalOrders: number;
  totalRevenue: number;
  newClients: number;
  pendingDeliveries: number;
};

export async function getMyClients(): Promise<CustomerClientDto[]> {
  try {
    const res = await apiRequest<any>("/api/Customers/my-clients", {
      method: "GET",
    });
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  } catch {
    try {
      const fallback = await apiRequest<any>("/api/Customers", {
        method: "GET",
      });
      if (Array.isArray(fallback)) return fallback;
      if (Array.isArray(fallback?.items)) return fallback.items;
      return [];
    } catch {
      return [];
    }
  }
}

export async function getClientProfile(clientId: string): Promise<CustomerClientDto | null> {
  try {
    return await apiRequest<CustomerClientDto>(`/api/Customers/${clientId}/profile`, {
      method: "GET",
    });
  } catch {
    return null;
  }
}

export async function getClientPricing(
  clientId: string,
): Promise<Array<{ productId: number; price: number }>> {
  try {
    const res = await apiRequest<Array<{ productId: number; price: number }>>(
      `/api/Customers/${clientId}/pricing`,
      { method: "GET" },
    );
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function setClientProductPrice(
  clientId: string,
  productId: number,
  price: number,
): Promise<void> {
  return apiRequest<void>(`/api/Customers/${clientId}/pricing`, {
    method: "POST",
    body: JSON.stringify({ productId, price }),
  });
}

export async function removeClientProductPrice(
  clientId: string,
  productId: number | string,
): Promise<void> {
  return apiRequest<void>(`/api/Customers/${clientId}/pricing/${productId}`, {
    method: "DELETE",
  });
}

export async function getClientStats(clientId: string): Promise<unknown> {
  try {
    return await apiRequest<unknown>(`/api/Customers/${clientId}/stats`, {
      method: "GET",
    });
  } catch {
    return null;
  }
}

export async function getDailySummary(): Promise<DailySummaryDto | null> {
  try {
    return await apiRequest<DailySummaryDto>("/api/Customers/daily-summary", {
      method: "GET",
    });
  } catch {
    return null;
  }
}

export async function addDeliveryPoint(payload: DeliveryPointRequest): Promise<unknown> {
  return apiRequest<unknown>("/api/Customers/add-delivery-point", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UserDeliveryPointDto = {
  id: string;
  userId: string;
  deliveryAddress: string;
  phoneNumber: string;
  pointName: string;
  isActive: boolean;
  creationDate?: string;
  provinceId: number;
  cityId: number;
  lat?: number | null;
  lon?: number | null;
  customRegion?: string | null;
};

export async function getDeliveryPoints(): Promise<UserDeliveryPointDto[]> {
  try {
    const res = await apiRequest<UserDeliveryPointDto[]>("/api/Customers/delivery-points", {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}
