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

const citrusImage =
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=200&q=80";
const oilImage =
  "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=200&q=80";
const herbImage =
  "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=200&q=80";
const cheeseImage =
  "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=200&q=80";
const berryImage =
  "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=200&q=80";

const productCatalogue = {
  "PROD-1001": {
    name: "Organic Citrus Mix",
    unit: "4 kg crate",
    price: 7400,
    image: citrusImage,
  },
  "PROD-1002": {
    name: "Premium Extra Virgin Olive Oil",
    unit: "1 L bottle",
    price: 9600,
    image: oilImage,
  },
  "PROD-1003": {
    name: "Artisan Basil Bundle",
    unit: "200 g bunch",
    price: 3900,
    image: herbImage,
  },
  "PROD-1004": {
    name: "Farmhouse Cheese Selection",
    unit: "1 kg wheel",
    price: 12500,
    image: cheeseImage,
  },
  "PROD-1005": {
    name: "Sunrise Berry Box",
    unit: "2 kg box",
    price: 6400,
    image: berryImage,
  },
  "PROD-1006": {
    name: "Aged Balsamic Vinegar",
    unit: "500 ml bottle",
    price: 11200,
    image: oilImage,
  },
  "PROD-1007": {
    name: "Aged Cheddar Wheel",
    unit: "3 kg wheel",
    price: 18400,
    image: cheeseImage,
  },
  "PROD-1008": {
    name: "Mixed Herb Crate",
    unit: "1 kg crate",
    price: 5600,
    image: herbImage,
  },
  "PROD-1009": {
    name: "Seasonal Stone Fruit",
    unit: "5 kg crate",
    price: 8900,
    image: berryImage,
  },
  "PROD-1010": {
    name: "Buffalo Mozzarella",
    unit: "12 × 125 g",
    price: 9800,
    image: cheeseImage,
  },
  "PROD-1011": {
    name: "Cold-Pressed Sunflower Oil",
    unit: "5 L can",
    price: 14300,
    image: oilImage,
  },
  "PROD-1012": {
    name: "Baby Leaf Salad",
    unit: "1 kg bag",
    price: 4700,
    image: herbImage,
  },
} satisfies Record<
  string,
  { name: string; unit: string; price: number; image: string }
>;

type LineInput = {
  productId: keyof typeof productCatalogue;
  quantity: number;
  minimumOrderQuantity?: number;
  offeredQuantity?: number;
  offeredPrice?: number;
  comment?: string;
};

function createLines(inputs: LineInput[]): HorecaOrderLine[] {
  return inputs.map((input, index) => {
    const product = productCatalogue[input.productId];

    return {
      id: `${input.productId}-${index + 1}`,
      productId: input.productId,
      name: product.name,
      image: product.image,
      unit: product.unit,
      minimumOrderQuantity: input.minimumOrderQuantity ?? 1,
      requestedQuantity: input.quantity,
      requestedPrice: product.price,
      offeredQuantity: input.offeredQuantity ?? input.quantity,
      offeredPrice: input.offeredPrice ?? product.price,
      comment: input.comment ?? "",
    };
  });
}

const suppliers = {
  "SUP-3001": {
    supplierName: "Ararat Harvest",
    supplierContactName: "Mariam Petrosyan",
    supplierPhone: "+374 77 245 818",
    supplierEmail: "orders@ararat-harvest.am",
    supplierAddress: "24 Araratyan Street, Yerevan",
  },
  "SUP-3002": {
    supplierName: "Mare & Terra",
    supplierContactName: "Arman Harutyunyan",
    supplierPhone: "+374 91 601 482",
    supplierEmail: "kitchen@mareterra.am",
    supplierAddress: "8 Komitas Avenue, Yerevan",
  },
  "SUP-3003": {
    supplierName: "Lori Dairy Co.",
    supplierContactName: "Lilit Avetisyan",
    supplierPhone: "+374 55 304 719",
    supplierEmail: "hello@loridairy.am",
    supplierAddress: "15 Tumanyan Street, Vanadzor",
  },
  "SUP-3004": {
    supplierName: "Green Line Herbs",
    supplierContactName: "Fadi Chalhoub",
    supplierPhone: "+961 3 233 617",
    supplierEmail: "orders@greenlineherbs.com",
    supplierAddress: "Mar Mikhael, Beirut",
  },
} satisfies Record<
  string,
  {
    supplierName: string;
    supplierContactName: string;
    supplierPhone: string;
    supplierEmail: string;
    supplierAddress: string;
  }
>;

const deliveryAddress = "Cedar Grove Restaurant, Hamra Street, Beirut";

type OrderInput = Omit<
  HorecaOrder,
  | "supplierName"
  | "supplierContactName"
  | "supplierPhone"
  | "supplierEmail"
  | "supplierAddress"
  | "deliveryAddress"
  | "lines"
> & {
  supplierId: keyof typeof suppliers;
  lines: LineInput[];
};

function createOrder(input: OrderInput): HorecaOrder {
  const { lines, supplierId, ...order } = input;

  return {
    ...order,
    supplierId,
    ...suppliers[supplierId],
    deliveryAddress,
    lines: createLines(lines),
  };
}

export const mockHorecaOrders: HorecaOrder[] = [
  createOrder({
    id: "HOR-4108",
    supplierId: "SUP-3001",
    placedAt: "2026-08-22T09:15:00",
    offerReceivedAt: "2026-08-23T10:42:00",
    deliveryDate: "2026-08-26",
    status: "Waiting for restaurant confirmation",
    lines: [
      {
        productId: "PROD-1001",
        quantity: 8,
        minimumOrderQuantity: 2,
        offeredPrice: 7900,
        comment: "Firm fruit, no soft skins",
      },
      { productId: "PROD-1005", quantity: 4 },
      {
        productId: "PROD-1009",
        quantity: 6,
        offeredQuantity: 4,
        comment: "Peaches preferred",
      },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Terra Verde Produce",
        date: "2026-08-22T09:15:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-23T10:42:00",
        note: "Citrus is up this week and stone fruit is short — 4 crates available.",
      },
    ],
  }),
  createOrder({
    id: "HOR-4107",
    supplierId: "SUP-3003",
    placedAt: "2026-08-21T14:05:00",
    offerReceivedAt: "2026-08-22T16:20:00",
    deliveryDate: "2026-08-25",
    status: "Waiting for restaurant confirmation",
    lines: [
      { productId: "PROD-1004", quantity: 6, offeredPrice: 13200 },
      { productId: "PROD-1007", quantity: 2 },
      {
        productId: "PROD-1010",
        quantity: 10,
        offeredPrice: 9800,
        comment: "Delivered in brine",
      },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Highland Dairy Co.",
        date: "2026-08-21T14:05:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-22T16:20:00",
        note: "Cheese moved up with this month's milk price. Everything else holds.",
      },
    ],
  }),
  createOrder({
    id: "HOR-4106",
    supplierId: "SUP-3004",
    placedAt: "2026-08-23T08:30:00",
    offerReceivedAt: null,
    deliveryDate: "2026-08-27",
    status: "New",
    lines: [
      { productId: "PROD-1003", quantity: 12 },
      { productId: "PROD-1008", quantity: 3 },
      { productId: "PROD-1012", quantity: 5, comment: "Ready-washed" },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Green Line Herbs",
        date: "2026-08-23T08:30:00",
      },
    ],
  }),
  createOrder({
    id: "HOR-4105",
    supplierId: "SUP-3002",
    placedAt: "2026-08-19T11:40:00",
    offerReceivedAt: "2026-08-20T09:10:00",
    deliveryDate: "2026-08-25",
    status: "Rejected",
    lines: [
      { productId: "PROD-1002", quantity: 24, minimumOrderQuantity: 3, offeredPrice: 10400 },
      { productId: "PROD-1006", quantity: 4 },
      { productId: "PROD-1011", quantity: 2, offeredQuantity: 1 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Levant Oil House",
        date: "2026-08-19T11:40:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-20T09:10:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Changes sent back",
        date: "2026-08-20T15:02:00",
        note: "We can hold last month's price on the olive oil, and we need both cans of sunflower oil.",
      },
    ],
  }),
  createOrder({
    id: "HOR-4104",
    supplierId: "SUP-3004",
    placedAt: "2026-08-18T10:00:00",
    offerReceivedAt: "2026-08-18T13:25:00",
    deliveryDate: "2026-08-24",
    status: "Confirmed",
    lines: [
      { productId: "PROD-1003", quantity: 10 },
      { productId: "PROD-1012", quantity: 6, offeredPrice: 4500 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Green Line Herbs",
        date: "2026-08-18T10:00:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-18T13:25:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Offer accepted",
        date: "2026-08-18T17:44:00",
      },
    ],
  }),
  createOrder({
    id: "HOR-4103",
    supplierId: "SUP-3001",
    placedAt: "2026-08-16T09:20:00",
    offerReceivedAt: "2026-08-16T12:00:00",
    deliveryDate: "2026-08-24",
    status: "Preparing",
    lines: [
      { productId: "PROD-1001", quantity: 12 },
      { productId: "PROD-1005", quantity: 6, offeredPrice: 6100 },
      { productId: "PROD-1009", quantity: 4 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Terra Verde Produce",
        date: "2026-08-16T09:20:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-16T12:00:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Offer accepted",
        date: "2026-08-16T14:35:00",
      },
      {
        id: "4",
        actor: "supplier",
        label: "Preparing your order",
        date: "2026-08-23T08:10:00",
      },
    ],
  }),
  createOrder({
    id: "HOR-4102",
    supplierId: "SUP-3003",
    placedAt: "2026-08-14T15:45:00",
    offerReceivedAt: "2026-08-14T18:30:00",
    deliveryDate: "2026-08-24",
    status: "Shipped",
    lines: [
      { productId: "PROD-1004", quantity: 4 },
      { productId: "PROD-1010", quantity: 8 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Highland Dairy Co.",
        date: "2026-08-14T15:45:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-14T18:30:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Offer accepted",
        date: "2026-08-15T08:05:00",
      },
      {
        id: "4",
        actor: "supplier",
        label: "Out for delivery",
        date: "2026-08-24T06:50:00",
      },
    ],
  }),
  createOrder({
    id: "HOR-4101",
    supplierId: "SUP-3004",
    placedAt: "2026-08-11T10:10:00",
    offerReceivedAt: "2026-08-11T12:40:00",
    deliveryDate: "2026-08-13",
    status: "Delivered",
    lines: [
      { productId: "PROD-1003", quantity: 14 },
      { productId: "PROD-1008", quantity: 2 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Green Line Herbs",
        date: "2026-08-11T10:10:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-11T12:40:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Offer accepted",
        date: "2026-08-11T16:00:00",
      },
      {
        id: "4",
        actor: "supplier",
        label: "Delivered",
        date: "2026-08-13T07:35:00",
      },
    ],
  }),
  createOrder({
    id: "HOR-4098",
    supplierId: "SUP-3002",
    placedAt: "2026-08-05T09:00:00",
    offerReceivedAt: "2026-08-05T11:15:00",
    deliveryDate: "2026-08-08",
    status: "Delivered",
    lines: [
      { productId: "PROD-1002", quantity: 18 },
      { productId: "PROD-1006", quantity: 6, offeredPrice: 10800 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Levant Oil House",
        date: "2026-08-05T09:00:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-08-05T11:15:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Offer accepted",
        date: "2026-08-05T13:20:00",
      },
      {
        id: "4",
        actor: "supplier",
        label: "Delivered",
        date: "2026-08-08T07:05:00",
      },
    ],
  }),
  createOrder({
    id: "HOR-4095",
    supplierId: "SUP-3001",
    placedAt: "2026-07-29T13:30:00",
    offerReceivedAt: "2026-07-30T09:45:00",
    deliveryDate: "2026-08-01",
    status: "Cancelled",
    lines: [
      { productId: "PROD-1001", quantity: 6 },
      { productId: "PROD-1009", quantity: 3 },
    ],
    history: [
      {
        id: "1",
        actor: "restaurant",
        label: "Order sent to Terra Verde Produce",
        date: "2026-07-29T13:30:00",
      },
      {
        id: "2",
        actor: "supplier",
        label: "Offer received",
        date: "2026-07-30T09:45:00",
      },
      {
        id: "3",
        actor: "restaurant",
        label: "Order cancelled",
        date: "2026-07-30T16:12:00",
        note: "Covered by the weekly market run.",
      },
    ],
  }),
];

export function getHorecaOrders(): HorecaOrder[] {
  return mockHorecaOrders;
}

export function getHorecaOrderById(orderId: string): HorecaOrder | undefined {
  return mockHorecaOrders.find((order) => order.id === orderId);
}
