export type CustomerStatus = "Active" | "Inactive";

export type CustomerOrderStatus =
  | "New"
  | "Rejected"
  | "Waiting for restaurant confirmation"
  | "Confirmed"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type CustomerOrder = {
  id: string;
  date: string;
  status: CustomerOrderStatus;
  itemCount: number;
  total: number;
};

export type CustomerPriceOverride = {
  productId: string;
  /** Identifies the packaging/selling option; legacy product-only prices map to the first option. */
  sellingOptionId?: string;
  productName: string;
  standardPrice: number;
  customPrice: number;
};

export type Customer = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  activityType: string;
  taxCode: string;
  status: CustomerStatus;
  customerSince: string;
  totalOrders: number;
  recentOrders: CustomerOrder[];
  priceOverrides: CustomerPriceOverride[];
};

export const mockCustomers: Customer[] = [];

export function getCustomerById(customerId: string): Customer | undefined {
  return mockCustomers.find((customer) => customer.id === customerId);
}

export function getAllCustomerOrders(): Array<
  CustomerOrder & { customerId: string; customerName: string }
> {
  return mockCustomers.flatMap((customer) =>
    customer.recentOrders.map((order) => ({
      ...order,
      customerId: customer.id,
      customerName: customer.companyName,
    })),
  );
}
