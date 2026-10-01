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

export const mockCustomers: Customer[] = [
  {
    id: "CUST-2001",
    companyName: "Blue Lagoon Hotel",
    contactName: "Sami Rahal",
    email: "purchasing@bluelagoonhotel.com",
    phone: "+961 3 456 789",
    address: "Jounieh Bay Road, Jounieh",
    activityType: "Hotel",
    taxCode: "TC-88213",
    status: "Active",
    customerSince: "2024-02-11",
    totalOrders: 42,
    recentOrders: [
      {
        id: "ORD-9112",
        date: "2026-08-18",
        status: "Rejected",
        itemCount: 6,
        total: 214.5,
      },
      {
        id: "ORD-9111",
        date: "2026-08-17",
        status: "Waiting for restaurant confirmation",
        itemCount: 9,
        total: 355.25,
      },
      {
        id: "ORD-9110",
        date: "2026-08-16",
        status: "New",
        itemCount: 7,
        total: 281.75,
      },
      {
        id: "ORD-9109",
        date: "2026-08-15",
        status: "Preparing",
        itemCount: 11,
        total: 442.0,
      },
      {
        id: "ORD-9108",
        date: "2026-08-14",
        status: "Shipped",
        itemCount: 10,
        total: 398.5,
      },
      {
        id: "ORD-9101",
        date: "2026-08-10",
        status: "Delivered",
        itemCount: 12,
        total: 486.5,
      },
      {
        id: "ORD-9088",
        date: "2026-08-03",
        status: "Delivered",
        itemCount: 8,
        total: 302.0,
      },
      {
        id: "ORD-9052",
        date: "2026-07-27",
        status: "Delivered",
        itemCount: 15,
        total: 611.75,
      },
      {
        id: "ORD-9021",
        date: "2026-07-20",
        status: "Cancelled",
        itemCount: 5,
        total: 145.0,
      },
      {
        id: "ORD-8994",
        date: "2026-07-13",
        status: "Delivered",
        itemCount: 10,
        total: 398.25,
      },
    ],
    priceOverrides: [
      {
        productId: "PROD-1001",
        productName: "Organic Citrus Mix",
        standardPrice: 18_500,
        customPrice: 16_750,
      },
      {
        productId: "PROD-1002",
        productName: "Premium Extra Virgin Olive Oil",
        standardPrice: 24_000,
        customPrice: 21_000,
      },
      {
        productId: "PROD-1004",
        productName: "Farmhouse Cheese Selection",
        standardPrice: 31_250,
        customPrice: 28_500,
      },
    ],
  },
  {
    id: "CUST-2002",
    companyName: "Cedar Grove Restaurant",
    contactName: "Layla Fakhoury",
    email: "orders@cedargroverestaurant.com",
    phone: "+961 3 512 348",
    address: "Hamra Street, Beirut",
    activityType: "Restaurant",
    taxCode: "TC-77410",
    status: "Active",
    customerSince: "2023-11-02",
    totalOrders: 76,
    recentOrders: [
      {
        id: "ORD-9104",
        date: "2026-08-11",
        status: "Preparing",
        itemCount: 20,
        total: 742.4,
      },
      {
        id: "ORD-9076",
        date: "2026-08-02",
        status: "Delivered",
        itemCount: 18,
        total: 690.1,
      },
      {
        id: "ORD-9040",
        date: "2026-07-24",
        status: "Delivered",
        itemCount: 9,
        total: 355.6,
      },
      {
        id: "ORD-9008",
        date: "2026-07-17",
        status: "Delivered",
        itemCount: 14,
        total: 528.9,
      },
      {
        id: "ORD-8971",
        date: "2026-07-09",
        status: "Waiting for restaurant confirmation",
        itemCount: 6,
        total: 210.0,
      },
    ],
    priceOverrides: [
      {
        productId: "PROD-1001",
        productName: "Organic Citrus Mix",
        standardPrice: 18_500,
        customPrice: 17_000,
      },
      {
        productId: "PROD-1003",
        productName: "Artisan Basil Bundle",
        standardPrice: 9_750,
        customPrice: 8_900,
      },
    ],
  },
  {
    id: "CUST-2003",
    companyName: "Riviera Beach Cafe",
    contactName: "Nadim Aoun",
    email: "supply@rivierabeachcafe.com",
    phone: "+961 3 622 981",
    address: "Corniche Street, Batroun",
    activityType: "Cafe",
    taxCode: "TC-65324",
    status: "Active",
    customerSince: "2025-01-19",
    totalOrders: 23,
    recentOrders: [
      {
        id: "ORD-9099",
        date: "2026-08-09",
        status: "Delivered",
        itemCount: 7,
        total: 198.25,
      },
      {
        id: "ORD-9061",
        date: "2026-07-30",
        status: "Delivered",
        itemCount: 5,
        total: 132.0,
      },
      {
        id: "ORD-9017",
        date: "2026-07-19",
        status: "Delivered",
        itemCount: 9,
        total: 245.5,
      },
      {
        id: "ORD-8982",
        date: "2026-07-10",
        status: "Delivered",
        itemCount: 4,
        total: 96.75,
      },
      {
        id: "ORD-8940",
        date: "2026-06-29",
        status: "Cancelled",
        itemCount: 3,
        total: 64.0,
      },
    ],
    priceOverrides: [
      {
        productId: "PROD-1005",
        productName: "Sunrise Berry Box",
        standardPrice: 16_000,
        customPrice: 14_500,
      },
    ],
  },
  {
    id: "CUST-2004",
    companyName: "Mountain View Resort",
    contactName: "Rana Dagher",
    email: "procurement@mountainviewresort.com",
    phone: "+961 3 733 105",
    address: "Faraya Road, Faraya",
    activityType: "Hotel",
    taxCode: "TC-54098",
    status: "Inactive",
    customerSince: "2022-09-30",
    totalOrders: 118,
    recentOrders: [
      {
        id: "ORD-8845",
        date: "2026-05-14",
        status: "Delivered",
        itemCount: 22,
        total: 890.0,
      },
      {
        id: "ORD-8801",
        date: "2026-05-02",
        status: "Delivered",
        itemCount: 16,
        total: 612.4,
      },
      {
        id: "ORD-8760",
        date: "2026-04-21",
        status: "Delivered",
        itemCount: 11,
        total: 401.5,
      },
      {
        id: "ORD-8712",
        date: "2026-04-08",
        status: "Cancelled",
        itemCount: 4,
        total: 120.0,
      },
      {
        id: "ORD-8670",
        date: "2026-03-27",
        status: "Delivered",
        itemCount: 19,
        total: 754.9,
      },
    ],
    priceOverrides: [
      {
        productId: "PROD-1002",
        productName: "Premium Extra Virgin Olive Oil",
        standardPrice: 24_000,
        customPrice: 22_500,
      },
      {
        productId: "PROD-1004",
        productName: "Farmhouse Cheese Selection",
        standardPrice: 31_250,
        customPrice: 29_000,
      },
    ],
  },
  {
    id: "CUST-2005",
    companyName: "Golden Fork Diner",
    contactName: "Elie Boustani",
    email: "orders@goldenforkdiner.com",
    phone: "+961 3 844 227",
    address: "Zahle Boulevard, Zahle",
    activityType: "Restaurant",
    taxCode: "TC-43217",
    status: "Active",
    customerSince: "2024-06-08",
    totalOrders: 31,
    recentOrders: [
      {
        id: "ORD-9107",
        date: "2026-08-12",
        status: "New",
        itemCount: 13,
        total: 476.3,
      },
      {
        id: "ORD-9070",
        date: "2026-08-01",
        status: "Delivered",
        itemCount: 10,
        total: 362.0,
      },
      {
        id: "ORD-9033",
        date: "2026-07-22",
        status: "Delivered",
        itemCount: 8,
        total: 289.5,
      },
      {
        id: "ORD-8990",
        date: "2026-07-11",
        status: "Delivered",
        itemCount: 12,
        total: 431.75,
      },
      {
        id: "ORD-8952",
        date: "2026-06-30",
        status: "Shipped",
        itemCount: 6,
        total: 198.0,
      },
    ],
    priceOverrides: [
      {
        productId: "PROD-1003",
        productName: "Artisan Basil Bundle",
        standardPrice: 9_750,
        customPrice: 9_000,
      },
    ],
  },
  {
    id: "CUST-2006",
    companyName: "Sunset Terrace Lounge",
    contactName: "Maya Chidiac",
    email: "purchasing@sunsetterracelounge.com",
    phone: "+961 3 955 462",
    address: "Gemmayze Street, Beirut",
    activityType: "Other",
    taxCode: "TC-31984",
    status: "Active",
    customerSince: "2025-04-27",
    totalOrders: 9,
    recentOrders: [
      {
        id: "ORD-9091",
        date: "2026-08-08",
        status: "Delivered",
        itemCount: 5,
        total: 156.25,
      },
      {
        id: "ORD-9044",
        date: "2026-07-25",
        status: "Delivered",
        itemCount: 3,
        total: 88.5,
      },
      {
        id: "ORD-8998",
        date: "2026-07-12",
        status: "Delivered",
        itemCount: 4,
        total: 121.0,
      },
    ],
    priceOverrides: [],
  },
];

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
