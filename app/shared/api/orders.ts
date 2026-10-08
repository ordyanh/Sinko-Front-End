import { apiRequest, ApiError } from "./http";

export type BackendOrderStatus =
  | "Draft"
  | "New"
  | "Seen"
  | "Accepted"
  | "Confirmed"
  | "InProgress"
  | "InPreparation"
  | "ReadyForDelivery"
  | "OnTheWay"
  | "Delivered"
  | "Rejected"
  | "Cancelled"
  | "WaitingConfirmation"
  | "Paid"
  | "Finished"
  | "Preparing"
  | "Shipped"
  | "Pending"
  | "Processing"
  | "Shipping"
  | "OfferReceived"
  | "OfferSent"
  | number;

export type OrderProductItem = {
  productId: number;
  count: number;
};

export type CreateOrderRequest = {
  suplierId?: string;
  supplierId?: string;
  deliveryAddressId?: string | null;
  description?: string | null;
  products: OrderProductItem[];
};

export type SupplierOrderGroupRequest = {
  supplierId: string;
  products: OrderProductItem[];
  description?: string | null;
};

export type CreateMultiSupplierOrderRequest = {
  deliveryAddressId?: string | null;
  description?: string | null;
  supplierOrders: SupplierOrderGroupRequest[];
};

export type CheckoutCartRequest = {
  deliveryAddressId?: string | null;
  description?: string | null;
};

export type OrderFilterRequest = {
  suplierId?: string;
  supplierId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: number;
  statusName?: string;
  search?: string;
  deliveryAddressId?: string;
  productId?: number;
  pageNumber?: number;
  pageSize?: number;
};

export type UpdateOrderStatusRequest = {
  orderId: string;
  status: BackendOrderStatus | string;
};

export type PriceRequestItemDto = {
  productId: number;
  supplierId?: string;
  requestedQuantity?: number;
  targetPrice?: number;
  quantity?: number;
};

export type PriceRequestDto = {
  restaurantId?: string;
  restaurantName?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  hvhh?: string;
  comment?: string;
  supplierId?: string;
  items: PriceRequestItemDto[];
};

export type ProductOfferItem = {
  productId: number;
  newPrice?: number;
  newQuantity?: number;
  offeredPrice?: number;
  quantity?: number;
  comment?: string | null;
};

export type PriceOfferRequest = {
  orderId: string;
  savePricesForCustomer?: boolean;
  items: ProductOfferItem[];
  comment?: string;
};

export type BackendOrderLineDto = {
  productId: number | string;
  productName: string;
  productCode?: string;
  quantity: number;
  count?: number;
  unitPrice: number;
  totalPrice: number;
  basePrice?: number;
  finalPrice?: number;
  discountPercent?: number;
  unit?: string | number;
  unitDisplay?: string;
  unitName?: string;
  imageUrl?: string;
  sellingOptionId?: string;
  sellingOptionName?: string;
  appliedPromotionId?: string;
  comment?: string;
};

export type BackendOrderDto = {
  id: string;
  orderId?: string;
  orderNumber?: string;
  status: BackendOrderStatus;
  statusCode?: number;
  horecaId?: string;
  horecaName?: string;
  clientName?: string;
  restaurantName?: string;
  supplierId?: string;
  suplierId?: string;
  supplierName?: string;
  suplierName?: string;
  deliveryAddress?: string;
  deliveryAddressId?: string;
  contactPerson?: string;
  contactPhone?: string;
  clientPhoneNumber?: string;
  clientEmail?: string;
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  description?: string;
  lines: BackendOrderLineDto[];
  items?: BackendOrderLineDto[];
  totalAmount: number;
  totalPrice?: number;
  finalPrice?: number;
  totalDiscount?: number;
  currency?: string;
  placedAt: string;
  creationDate?: string;
  updatedAt?: string;
  events?: Array<{
    id?: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
};

export function normalizeBackendOrderStatus(status: BackendOrderStatus | string): string {
  if (typeof status === "number") {
    switch (status) {
      case 0:
        return "Draft";
      case 1:
        return "New";
      case 2:
        return "Seen";
      case 3:
        return "Confirmed";
      case 4:
        return "InProgress";
      case 5:
        return "ReadyForDelivery";
      case 6:
        return "Delivered";
      case 7:
        return "Cancelled";
      case 8:
        return "WaitingConfirmation";
      case 9:
        return "Paid";
      case 10:
        return "Finished";
      default:
        return "New";
    }
  }

  const map: Record<string, string> = {
    Draft: "Draft",
    New: "New",
    Seen: "Seen",
    Accepted: "Confirmed",
    Confirmed: "Confirmed",
    Preparing: "InProgress",
    Processing: "InProgress",
    InProgress: "InProgress",
    InPreparation: "InProgress",
    Shipped: "ReadyForDelivery",
    Shipping: "ReadyForDelivery",
    ReadyForDelivery: "ReadyForDelivery",
    OnTheWay: "ReadyForDelivery",
    Delivered: "Delivered",
    Cancelled: "Cancelled",
    Rejected: "Rejected",
    Pending: "WaitingConfirmation",
    "Waiting for restaurant confirmation": "WaitingConfirmation",
    WaitingConfirmation: "WaitingConfirmation",
    OfferReceived: "WaitingConfirmation",
    OfferSent: "WaitingConfirmation",
    Paid: "Paid",
    Finished: "Finished",
  };

  return map[status] ?? status;
}

export function normalizeBackendOrder(raw: any): BackendOrderDto {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      status: "New",
      lines: [],
      items: [],
      totalAmount: 0,
      placedAt: new Date().toISOString(),
    };
  }

  const id = String(raw.orderId ?? raw.OrderId ?? raw.id ?? raw.Id ?? "");
  const placedAt = String(
    raw.creationDate ??
      raw.CreationDate ??
      raw.placedAt ??
      raw.PlacedAt ??
      new Date().toISOString(),
  );

  const rawStatus = raw.status ?? raw.Status ?? "New";
  const statusStr = normalizeBackendOrderStatus(rawStatus);

  const rawItems = Array.isArray(raw.items ?? raw.Items)
    ? (raw.items ?? raw.Items)
    : Array.isArray(raw.lines ?? raw.Lines)
      ? (raw.lines ?? raw.Lines)
      : [];

  const lines: BackendOrderLineDto[] = rawItems.map((item: any) => {
    const qty = Number(
      item.count ??
        item.Count ??
        item.quantity ??
        item.Quantity ??
        item.requestedQuantity ??
        1,
    );
    const unitPrice = Number(
      item.finalPrice ??
        item.FinalPrice ??
        item.basePrice ??
        item.BasePrice ??
        item.unitPrice ??
        item.UnitPrice ??
        0,
    );
    const totalPrice = Number(
      item.totalPrice ?? item.TotalPrice ?? unitPrice * qty,
    );

    return {
      productId: item.productId ?? item.ProductId ?? "",
      productName: String(
        item.productName ??
          item.ProductName ??
          item.name ??
          item.Name ??
          "Product",
      ),
      productCode: item.productCode ?? item.ProductCode,
      quantity: qty,
      count: qty,
      unitPrice,
      totalPrice,
      basePrice: Number(item.basePrice ?? item.BasePrice ?? unitPrice),
      finalPrice: Number(item.finalPrice ?? item.FinalPrice ?? unitPrice),
      discountPercent: item.discountPercent ?? item.DiscountPercent,
      unit:
        item.unitDisplay ??
        item.UnitDisplay ??
        item.unitName ??
        item.UnitName ??
        item.unit ??
        item.Unit ??
        "Piece",
      unitDisplay: item.unitDisplay ?? item.UnitDisplay,
      unitName: item.unitName ?? item.UnitName,
      imageUrl: item.imageUrl ?? item.ImageUrl ?? item.image ?? item.Image,
      sellingOptionId: item.sellingOptionId ?? item.SellingOptionId,
      sellingOptionName: item.sellingOptionName ?? item.SellingOptionName,
      appliedPromotionId: item.appliedPromotionId ?? item.AppliedPromotionId,
      comment: item.comment ?? item.Comment ?? "",
    };
  });

  const totalAmount = Number(
    raw.finalPrice ??
      raw.FinalPrice ??
      raw.totalPrice ??
      raw.TotalPrice ??
      raw.totalAmount ??
      raw.TotalAmount ??
      lines.reduce((sum, l) => sum + l.totalPrice, 0),
  );

  return {
    id,
    orderId: id,
    orderNumber: raw.orderNumber ?? raw.OrderNumber ?? id,
    status: statusStr as BackendOrderStatus,
    statusCode: typeof rawStatus === "number" ? rawStatus : undefined,
    horecaId: raw.horecaId ?? raw.HorecaId ?? raw.clientId ?? raw.ClientId,
    horecaName:
      raw.horecaName ??
      raw.HorecaName ??
      raw.clientName ??
      raw.ClientName ??
      raw.restaurantName ??
      raw.RestaurantName,
    clientName:
      raw.clientName ?? raw.ClientName ?? raw.horecaName ?? raw.HorecaName,
    restaurantName:
      raw.restaurantName ??
      raw.RestaurantName ??
      raw.clientName ??
      raw.ClientName,
    supplierId:
      raw.supplierId ?? raw.SupplierId ?? raw.suplierId ?? raw.SuplierId,
    supplierName:
      raw.supplierName ??
      raw.SupplierName ??
      raw.suplierName ??
      raw.SuplierName,
    suplierName:
      raw.suplierName ??
      raw.SuplierName ??
      raw.supplierName ??
      raw.SupplierName,
    deliveryAddress: raw.deliveryAddress ?? raw.DeliveryAddress,
    deliveryAddressId: String(
      raw.deliveryAddressId ?? raw.DeliveryAddressId ?? "",
    ),
    contactPerson:
      raw.contactPerson ??
      raw.ContactPerson ??
      raw.createdByEmployeeName ??
      raw.CreatedByEmployeeName,
    contactPhone:
      raw.contactPhone ??
      raw.ContactPhone ??
      raw.clientPhoneNumber ??
      raw.ClientPhoneNumber,
    clientPhoneNumber:
      raw.clientPhoneNumber ?? raw.ClientPhoneNumber ?? raw.contactPhone,
    clientEmail: raw.clientEmail ?? raw.ClientEmail,
    createdByEmployeeId: raw.createdByEmployeeId ?? raw.CreatedByEmployeeId,
    createdByEmployeeName: raw.createdByEmployeeName ?? raw.CreatedByEmployeeName,
    assignedEmployeeId: raw.assignedEmployeeId ?? raw.AssignedEmployeeId,
    assignedEmployeeName:
      raw.assignedEmployeeName ?? raw.AssignedEmployeeName,
    description: raw.description ?? raw.Description,
    lines,
    items: lines,
    totalAmount,
    totalPrice: Number(raw.totalPrice ?? raw.TotalPrice ?? totalAmount),
    finalPrice: Number(raw.finalPrice ?? raw.FinalPrice ?? totalAmount),
    totalDiscount: Number(
      raw.totalDiscount ??
        raw.TotalDiscount ??
        raw.discount ??
        raw.Discount ??
        0,
    ),
    currency: raw.currency ?? raw.Currency ?? "AMD",
    placedAt,
    creationDate: placedAt,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt,
    events: raw.events ?? raw.Events,
  };
}

function buildQueryString(filter?: OrderFilterRequest): string {
  if (!filter) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function getHorecaOrders(filter?: OrderFilterRequest): Promise<BackendOrderDto[]> {
  const query = buildQueryString(filter);
  const res = await apiRequest<unknown>(`/api/Orders/get-orders${query}`, {
    method: "GET",
  });
  if (Array.isArray(res)) return res.map(normalizeBackendOrder);
  if (res && typeof res === "object" && Array.isArray((res as any).items)) {
    return (res as any).items.map(normalizeBackendOrder);
  }
  return [];
}

export async function getSupplierOrders(filter?: OrderFilterRequest): Promise<BackendOrderDto[]> {
  const query = buildQueryString(filter);
  const res = await apiRequest<unknown>(`/api/Orders/supplier/get-orders${query}`, {
    method: "GET",
  });
  if (Array.isArray(res)) return res.map(normalizeBackendOrder);
  if (res && typeof res === "object" && Array.isArray((res as any).items)) {
    return (res as any).items.map(normalizeBackendOrder);
  }
  return [];
}

export async function getHorecaOrderById(orderId: string): Promise<BackendOrderDto | null> {
  const orders = await getHorecaOrders();
  return orders.find((o) => o.id === orderId || o.orderId === orderId) ?? null;
}

export async function getSupplierOrderById(orderId: string): Promise<BackendOrderDto> {
  const res = await apiRequest<unknown>(`/api/Orders/supplier/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
  return normalizeBackendOrder(res);
}

export async function createOrder(payload: CreateOrderRequest): Promise<BackendOrderDto> {
  const body = {
    suplierId: payload.suplierId || payload.supplierId || "",
    supplierId: payload.supplierId || payload.suplierId || "",
    deliveryAddressId: payload.deliveryAddressId ?? null,
    description: payload.description ?? null,
    products: (payload.products || []).map((p) => ({
      productId: Number(p.productId),
      count: Number(p.count),
    })),
  };
  const res = await apiRequest<unknown>("/api/Orders/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeBackendOrder(res);
}

export async function createMultiSupplierOrder(
  payload: CreateMultiSupplierOrderRequest,
): Promise<BackendOrderDto[]> {
  const body = {
    deliveryAddressId: payload.deliveryAddressId ?? null,
    description: payload.description ?? null,
    supplierOrders: (payload.supplierOrders || []).map((group) => ({
      supplierId: group.supplierId || "",
      description: group.description ?? null,
      products: (group.products || []).map((p) => ({
        productId: Number(p.productId),
        count: Number(p.count),
      })),
    })),
  };
  const res = await apiRequest<unknown>("/api/Orders/create-multi", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (Array.isArray(res)) return res.map(normalizeBackendOrder);
  return [];
}

export async function checkoutCart(payload: CheckoutCartRequest): Promise<BackendOrderDto[]> {
  const res = await apiRequest<unknown>("/api/Orders/checkout-cart", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (Array.isArray(res)) return res.map(normalizeBackendOrder);
  return [];
}

export async function updateOrderStatus(
  orderId: string,
  status: BackendOrderStatus | string,
): Promise<void> {
  const normalizedStatus = normalizeBackendOrderStatus(status);
  try {
    return await apiRequest<void>("/api/Orders/update-status", {
      method: "PATCH",
      body: JSON.stringify({ orderId, status: normalizedStatus }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 405) {
      return await apiRequest<void>("/api/Orders/update-status", {
        method: "POST",
        body: JSON.stringify({ orderId, status: normalizedStatus }),
      });
    }
    throw error;
  }
}

export async function updateDraftOrder(
  orderId: string,
  payload: CreateOrderRequest,
): Promise<void> {
  const body = {
    suplierId: payload.suplierId || payload.supplierId || "",
    supplierId: payload.supplierId || payload.suplierId || "",
    deliveryAddressId: payload.deliveryAddressId ?? null,
    description: payload.description ?? null,
    products: (payload.products || []).map((p) => ({
      productId: Number(p.productId),
      count: Number(p.count),
    })),
  };
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/update-draft`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function acceptOrder(orderId: string): Promise<void> {
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/accept`, {
    method: "POST",
  });
}

export async function assignOrder(orderId: string, targetEmployeeId?: string): Promise<void> {
  const query = targetEmployeeId ? `?targetEmployeeId=${encodeURIComponent(targetEmployeeId)}` : "";
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/assign${query}`, {
    method: "POST",
  });
}

export async function sendPriceOffer(payload: PriceOfferRequest): Promise<void> {
  const body = {
    orderId: payload.orderId,
    savePricesForCustomer: payload.savePricesForCustomer ?? false,
    items: (payload.items || []).map((item) => ({
      productId: Number(item.productId),
      newPrice: Number(item.newPrice ?? item.offeredPrice ?? 0),
      newQuantity: Number(item.newQuantity ?? item.quantity ?? 1),
      comment: item.comment ?? null,
    })),
  };
  return apiRequest<void>("/api/Orders/send-offer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function sendPriceRequest(payload: PriceRequestDto): Promise<unknown> {
  const body = {
    restaurantId: payload.restaurantId ?? null,
    restaurantName: payload.restaurantName ?? null,
    deliveryAddress: payload.deliveryAddress ?? null,
    deliveryDate: payload.deliveryDate ?? null,
    hvhh: payload.hvhh ?? null,
    comment: payload.comment ?? null,
    items: (payload.items || []).map((i) => ({
      productId: Number(i.productId),
      supplierId: i.supplierId ?? payload.supplierId ?? null,
      requestedQuantity: Number(i.requestedQuantity ?? i.quantity ?? 1),
    })),
  };
  return apiRequest<unknown>("/api/Orders/price-request", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function respondToOffer(orderId: string, accept: boolean): Promise<void> {
  return apiRequest<void>(
    `/api/Orders/${encodeURIComponent(orderId)}/respond-to-offer?accept=${Boolean(accept)}`,
    {
      method: "POST",
    },
  );
}

export async function acceptOffer(orderId: string): Promise<void> {
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/accept-offer`, {
    method: "POST",
  });
}

export async function rejectOffer(orderId: string): Promise<void> {
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/reject-offer`, {
    method: "POST",
  });
}

export async function cancelOrder(orderId: string): Promise<void> {
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
  });
}

export async function approveOrder(orderId: string): Promise<void> {
  return apiRequest<void>(`/api/Orders/${encodeURIComponent(orderId)}/approve`, {
    method: "POST",
  });
}

export async function repeatOrder(
  orderId: string,
): Promise<{ message: string; newOrderId: string }> {
  return apiRequest<{ message: string; newOrderId: string }>(
    `/api/Orders/repeat/${encodeURIComponent(orderId)}`,
    {
      method: "POST",
    },
  );
}
