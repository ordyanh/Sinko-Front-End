import { apiRequest } from "./http";

export type SupplierDashboardDto = {
  totalRevenue?: number;
  totalOrders?: number;
  activeProducts?: number;
  activeClients?: number;
  recentOrders?: Array<{
    id: string;
    orderNumber?: string;
    horecaName?: string;
    totalAmount: number;
    status: string;
    placedAt: string;
  }>;
  chartData?: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
};

export async function getSupplierDashboard(): Promise<SupplierDashboardDto | null> {
  try {
    return await apiRequest<SupplierDashboardDto>("/api/supplier/dashboard", {
      method: "GET",
    });
  } catch {
    try {
      return await apiRequest<SupplierDashboardDto>("/api/dashboard/supplier", {
        method: "GET",
      });
    } catch {
      return null;
    }
  }
}
