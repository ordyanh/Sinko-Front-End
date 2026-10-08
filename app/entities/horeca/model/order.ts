import type { CustomerOrderStatus } from "./customer";

export type HorecaOrderStatus = CustomerOrderStatus;

export type HorecaOrderLine = {
  id: string;
  productId: string;
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

export type HorecaOrderEvent = {
  id: string;
  actor: "restaurant" | "supplier";
  label: string;
  date: string;
  note?: string;
};

export type HorecaOrder = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierContactName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  placedAt: string;
  offerReceivedAt: string | null;
  deliveryDate: string;
  deliveryAddress: string;
  status: HorecaOrderStatus;
  lines: HorecaOrderLine[];
  history: HorecaOrderEvent[];
};

// Restaurant-facing wording. The stored status is shared with the supplier side,
// where the same value reads from the opposite point of view.
export const horecaOrderStatusLabels: Record<HorecaOrderStatus, string> = {
  New: "Awaiting offer",
  "Waiting for restaurant confirmation": "Needs your review",
  Rejected: "Changes requested",
  Confirmed: "Confirmed",
  Preparing: "Preparing",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

// Orange marks the orders the restaurant has to act on, slate the ones sitting
// with the supplier. Fulfilment progress is shown with a meter, not a colour.
export const horecaOrderStatusClasses: Record<HorecaOrderStatus, string> = {
  New: "border-slate-200 bg-slate-50 text-slate-600",
  "Waiting for restaurant confirmation":
    "border-primary/30 bg-primary/10 text-primary",
  Rejected: "border-slate-200 bg-slate-50 text-slate-600",
  Confirmed: "border-slate-200 bg-slate-50 text-slate-600",
  Preparing: "border-slate-200 bg-slate-50 text-slate-600",
  Shipped: "border-slate-200 bg-slate-50 text-slate-600",
  Delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

export const fulfilmentSteps = [
  "Confirmed",
  "Preparing",
  "Shipped",
  "Delivered",
] as const;

export function isOfferEditable(status: HorecaOrderStatus) {
  return status === "Waiting for restaurant confirmation";
}

export function getRequestedTotal(lines: HorecaOrderLine[]) {
  return lines.reduce(
    (total, line) => total + line.requestedPrice * line.requestedQuantity,
    0,
  );
}

export function getOfferedTotal(lines: HorecaOrderLine[]) {
  return lines.reduce(
    (total, line) => total + line.offeredPrice * line.offeredQuantity,
    0,
  );
}

// A lower total is only good news when the supplier can still deliver every
// unit that was asked for, so short lines are counted separately.
export function getShortLineCount(lines: HorecaOrderLine[]) {
  return lines.filter((line) => line.offeredQuantity < line.requestedQuantity)
    .length;
}

export type OfferTone = "up" | "down" | "neutral";

export function getOfferTone(delta: number, shortLineCount: number): OfferTone {
  if (delta > 0) return "up";
  if (delta < 0 && shortLineCount === 0) return "down";
  return "neutral";
}

export const offerToneClasses: Record<OfferTone, string> = {
  up: "text-rose-600",
  down: "text-emerald-600",
  neutral: "text-slate-500",
};

// Grouping is formatted with a fixed locale: currency-style "hy-AM" resolves
// differently on the server than in the browser and breaks hydration.
export function formatAmd(amount: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)} \u058F`;
}

export function formatAmdDelta(amount: number) {
  const sign = amount > 0 ? "+" : "−";
  return `${sign}${formatAmd(Math.abs(amount))}`;
}

export function formatOrderDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatOrderDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const mockHorecaOrders: HorecaOrder[] = [];

export function getHorecaOrders(): HorecaOrder[] {
  return mockHorecaOrders;
}

export function getHorecaOrderById(orderId: string): HorecaOrder | undefined {
  return mockHorecaOrders.find((order) => order.id === orderId);
}
