export type AccountRole = "horeca" | "supplier";

export type SeedUser = {
  id: string;
  role: AccountRole;
  email: string;
  username: string;
  password: string;
  companyName: string;
  address: string;
  displayName: string;
};

export type LoggedInUser = Omit<SeedUser, "password">;

export type StoredEmployee = {
  id: string;
  accountId: string;
  accountRole: AccountRole;
  name: string;
  email: string;
  role: string;
  location: string;
  phoneNumber?: string;
  status: "Active" | "On vacation";
  vacationStartDate?: string;
  vacationEndDate?: string;
};

export type StoredSupplierCategory = {
  id: string;
  accountId: string;
  name: string;
};

export type StoredSupplierProfile = {
  accountId: string;
  categoryIds: string[];
  description: string;
};

export type SupplierProductStatus = "Active" | "Inactive" | "Unlisted" | "Draft";

export type StoredSupplierProductSellingOption = {
  id: string;
  quantity: number;
  unitType: string;
  piecesPerPackage?: number;
  customUnit?: string;
  price: number;
  compareAtPrice?: number;
  minimumOrderQuantity: number;
  companyPrices: Array<{
    resourceId: string;
    individualPrice: number;
  }>;
};

/** A supplier-owned catalog product, stored locally until a catalog API is connected. */
export type StoredSupplierProduct = {
  id: string;
  accountId: string;
  name: string;
  description: string;
  categoryIds: string[];
  code?: string;
  imageUrl?: string;
  status: SupplierProductStatus;
  createdAt: string;
  sellingOptions: StoredSupplierProductSellingOption[];
};

export type StoredPromotionStatus = "Draft" | "Active";

/**
 * Supplier promotion configuration kept in IndexedDB while the product uses its
 * local mock backend. Banner artwork is stored as a data URL to model the
 * storage-service payload without introducing a server dependency.
 */
export type StoredSupplierPromotion = {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type: "FixedPrice" | "Percentage" | "BuyXGetY";
  status: StoredPromotionStatus;
  startDate: string;
  endDate?: string;
  productIds: string[];
  discountScope?: "all-options" | "specific-options";
  discountOptionKeys: string[];
  fixedPrices: Record<string, string>;
  discountPercent?: string;
  triggerProductId?: string;
  triggerOptionId?: string;
  triggerQuantity?: string;
  targetProductId?: string;
  targetOptionId?: string;
  targetQuantity?: string;
  /** Optional multiple eligible gifts; legacy target fields remain supported. */
  giftChoices?: Array<{ productId: string; optionId: string }>;
  eligibility: "all-customers" | "specific-customers";
  eligibleCustomerIds: string[];
  applyOnIndividualPricing: boolean;
  isBannerEnabled: boolean;
  display: "home-banner" | "promotion-list" | "both";
  bannerImage?: {
    dataUrl: string;
    fileName: string;
    mimeType: "image/jpeg" | "image/png";
  };
  brandColorFallback: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredOrderStatus =
  | "New"
  | "Rejected"
  | "Waiting for restaurant confirmation"
  | "Confirmed"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type StoredOrderLine = {
  id: string;
  productId: string;
  /** Legacy orders may not have this; new marketplace orders always do. */
  sellingOptionId?: string;
  name: string;
  image: string;
  unit: string;
  minimumOrderQuantity: number;
  requestedQuantity: number;
  requestedPrice: number;
  offeredQuantity: number;
  offeredPrice: number;
  comment: string;
  /** Present only when this is a Buy X, Get Y free-gift line. */
  promotionId?: string;
  promotionTitle?: string;
  isPromotionGift?: boolean;
};

export type StoredOrderEvent = {
  id: string;
  actor: "restaurant" | "supplier";
  label: string;
  date: string;
  note?: string;
};

/**
 * A company-owned delivery destination. Approval and activity are evaluated
 * when an order is placed; they are never used to rewrite an existing order.
 */
export type StoredDeliveryAddress = {
  id: string;
  accountId: string;
  fullAddress: string;
  label?: string;
  contactPerson: string;
  contactPhone: string;
  approved: boolean;
  active: boolean;
};

/** Immutable delivery information copied onto an order at placement time. */
export type StoredOrderDeliveryAddressSnapshot = {
  addressId: string;
  fullAddress: string;
  label?: string;
  contactPerson: string;
  contactPhone: string;
};

/** An order shared between the buyer and supplier accounts that own it. */
export type StoredOrder = {
  id: string;
  horecaAccountId: string;
  horecaName: string;
  horecaContactName: string;
  horecaEmail: string;
  horecaPhone: string;
  horecaAddress: string;
  supplierAccountId: string;
  /** Kept as the marketplace-facing supplier identifier used by order routes. */
  supplierId: string;
  supplierName: string;
  supplierContactName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  placedAt: string;
  offerReceivedAt: string | null;
  deliveryDate: string;
  /** Legacy address projection kept for older order list/detail consumers. */
  deliveryAddress: string;
  deliveryAddressSnapshot: StoredOrderDeliveryAddressSnapshot;
  status: StoredOrderStatus;
  lines: StoredOrderLine[];
  history: StoredOrderEvent[];
};
