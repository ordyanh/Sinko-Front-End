import { apiRequest } from "./http";

export type CustomerClientDto = {
  id: string;
  clientId?: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  hvhh?: string;
  taxCode?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  status?: string;
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
    const res = await apiRequest<CustomerClientDto[]>("/api/Customers/my-clients", {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch {
    try {
      const fallback = await apiRequest<CustomerClientDto[]>("/api/Customers", {
        method: "GET",
      });
      return Array.isArray(fallback) ? fallback : [];
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
