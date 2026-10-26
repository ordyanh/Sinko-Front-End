import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock3,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Package,
  PackageCheck,
  Pencil,
  Phone,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { DashboardPageContent, DashboardPageHeader, ArmeniaMapPicker } from "~/shared/ui";
import { Input, Select } from "~/shared/ui/form";
import {
  getLoggedInUser,
  getOrderForSupplier,
  getSupplierProducts,
  saveOrder,
  saveSupplierProduct,
  getEmployeesForAccount,
  type StoredOrder,
} from "~/shared/lib/indexed-db";
import { useToast } from "~/shared/ui/toast";
import {
  acceptOrder as backendAcceptOrder,
  updateOrderStatus as backendUpdateOrderStatus,
  sendPriceOffer as backendSendPriceOffer,
  assignOrder as backendAssignOrder,
} from "~/shared/api/orders";
import { broadcastOrderNotification } from "~/shared/lib/use-notification-center";
import { getEmployeesList, type EmployeeListItem } from "~/shared/api/employee";
import { getClientProfile } from "~/shared/api/customers";
import type { StoredEmployee } from "~/shared/lib/indexed-db";
import { getCurrentUserEmployeeRole } from "~/shared/lib/auth-token";
import { isGuid } from "~/shared/api/notifications";
import { useTranslation } from "~/shared/lib/i18n";

type OrderStatus =
  | "New"
  | "Rejected"
  | "Waiting for restaurant confirmation"
  | "Confirmed"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

function getLocalizedOrderStatus(status: OrderStatus, t: (k: string) => string): string {
  const map: Record<OrderStatus, string> = {
    New: "orders.statusNew",
    "Waiting for restaurant confirmation": "orders.statusWaitingConfirmation",
    Confirmed: "orders.statusConfirmed",
    Preparing: "orders.statusPreparing",
    Shipped: "orders.statusShipped",
    Delivered: "orders.statusDelivered",
    Cancelled: "orders.statusCancelled",
    Rejected: "orders.statusRejected",
  };
  return map[status] ? t(map[status]) : status;
}

type OrderLine = {
  id: string;
  productId: string;
  sellingOptionId: string;
  name: string;
  image: string;
  unit: string;
  minimumOrderQuantity: number;
  price: number;
  quantity: number;
  comment: string;
};

const statusStyles: Record<OrderStatus, string> = {
  New: "border-amber-200 bg-amber-50 text-amber-800",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
  "Waiting for restaurant confirmation":
    "border-sky-200 bg-sky-50 text-sky-700",
  Confirmed: "border-violet-200 bg-violet-50 text-violet-700",
  Preparing: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Shipped: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

function formatDate(date: string) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("hy-AM", {
    style: "currency",
    currency: "AMD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </p>
  );
}

function OrderHeaderActions({
  status,
  isEditingOffer,
  isWarehouseManager,
  isSubmitting,
  onStatusChange,
  onEditingOfferChange,
  t,
}: {
  status: OrderStatus;
  isEditingOffer: boolean;
  isWarehouseManager: boolean;
  isSubmitting: boolean;
  onStatusChange: (status: OrderStatus) => void;
  onEditingOfferChange: (isEditing: boolean) => void;
  t: (k: string, f?: string, p?: Record<string, string | number>) => string;
}) {
  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    Confirmed: "Preparing",
    Preparing: "Shipped",
    Shipped: "Delivered",
  };

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(() => nextStatus[status] || status);

  useEffect(() => {
    setSelectedStatus(nextStatus[status] || status);
  }, [status]);

  if (status === "New" && !isEditingOffer) {
    if (isWarehouseManager) {
      return (
        <span className="text-xs italic text-slate-500">
          {t("orders.warehouseManagerNotice")}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onEditingOfferChange(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {t("orders.editOffer")}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onStatusChange("Confirmed")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50"
        >
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? t("orders.confirmingOrder") : t("orders.confirmOrder")}
        </button>
      </div>
    );
  }

  if ((status === "New" || status === "Rejected") && isEditingOffer) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onEditingOfferChange(false)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          {t("orders.cancelEditing")}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onStatusChange("Waiting for restaurant confirmation")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSubmitting
            ? t("orders.sendingOffer")
            : status === "Rejected"
              ? t("orders.sendRevisedOffer")
              : t("orders.sendOffer")}
        </button>
      </div>
    );
  }

  if (status === "Rejected") {
    if (isWarehouseManager) return null;
    return (
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onEditingOfferChange(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {t("orders.editRejectedOffer")}
      </button>
    );
  }

  const isFulfillment = status === "Confirmed" || status === "Preparing" || status === "Shipped";
  if (isFulfillment) {
    const availableStatuses: OrderStatus[] = isWarehouseManager
      ? ["Preparing", "Shipped", "Delivered"]
      : ["Confirmed", "Preparing", "Shipped", "Delivered", "Cancelled"];

    return (
      <div className="flex flex-wrap items-center gap-3">
        {!isWarehouseManager ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onStatusChange("Cancelled")}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {t("orders.cancelOrder")}
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          <select
            id="supplier-order-status-select"
            aria-label={t("orders.selectStatus")}
            value={selectedStatus}
            disabled={isSubmitting}
            onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:opacity-50 cursor-pointer transition"
          >
            {availableStatuses.map((st) => (
              <option key={st} value={st}>
                {getLocalizedOrderStatus(st, t)}
              </option>
            ))}
          </select>
          <button
            id="supplier-order-confirm-status-button"
            type="button"
            disabled={isSubmitting || selectedStatus === status}
            onClick={() => onStatusChange(selectedStatus)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? t("orders.advancingOrder") : t("orders.confirmStatusChange")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function SupplierOrderDetailsPage() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const { showToast } = useToast();
  const employeeRole = getCurrentUserEmployeeRole();
  const isWarehouseManager = employeeRole === "WarehouseManager";

  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [status, setStatus] = useState<OrderStatus>("New");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [savePrices, setSavePrices] = useState(true);
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [offerSaveError, setOfferSaveError] = useState<string>();
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [hasCopiedAddress, setHasCopiedAddress] = useState(false);

  const handleCopyAddress = (textToCopy: string) => {
    if (!textToCopy) return;
    try {
      void navigator.clipboard?.writeText(textToCopy);
      setHasCopiedAddress(true);
      setTimeout(() => {
        setHasCopiedAddress(false);
      }, 2000);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "supplier" || !orderId) return;

      // Load employees for assignment
      try {
        const list = await getEmployeesList();
        if (isCurrent && Array.isArray(list) && list.length > 0) {
          setEmployeeOptions(
            list.map((e: EmployeeListItem) => ({
              id: e.id,
              name: e.employeeName || `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email || "Employee",
            })),
          );
        } else {
          const stored = await getEmployeesForAccount(user.id);
          if (isCurrent && stored.length > 0) {
            setEmployeeOptions(stored.map((e: StoredEmployee) => ({ id: e.id, name: e.name })));
          }
        }
      } catch {
        const stored = await getEmployeesForAccount(user.id);
        if (isCurrent && stored.length > 0) {
          setEmployeeOptions(stored.map((e) => ({ id: e.id, name: e.name })));
        }
      }

      const storedOrder = await getOrderForSupplier(user.id, orderId);
      if (!isCurrent || !storedOrder) return;

      // Ensure delivery address & coordinates are resolved from client profile if missing
      if (
        storedOrder.horecaAccountId &&
        (storedOrder.deliveryAddressSnapshot?.lat == null ||
          !storedOrder.deliveryAddress ||
          storedOrder.deliveryAddress === "[No Address]")
      ) {
        try {
          const client = await getClientProfile(storedOrder.horecaAccountId);
          if (client) {
            const enrichedAddress =
              client.address ||
              (client.serviceAreas && client.serviceAreas.length > 0
                ? client.serviceAreas[0].name
                : "");
            if (
              (!storedOrder.deliveryAddress ||
                storedOrder.deliveryAddress === "[No Address]") &&
              enrichedAddress
            ) {
              storedOrder.deliveryAddress = enrichedAddress;
              storedOrder.horecaAddress = enrichedAddress;
              if (storedOrder.deliveryAddressSnapshot) {
                storedOrder.deliveryAddressSnapshot.fullAddress = enrichedAddress;
              }
            }
            if (storedOrder.deliveryAddressSnapshot) {
              if (storedOrder.deliveryAddressSnapshot.lat == null) {
                storedOrder.deliveryAddressSnapshot.lat =
                  client.lat ?? client.serviceAreas?.[0]?.lat ?? null;
              }
              if (storedOrder.deliveryAddressSnapshot.lon == null) {
                storedOrder.deliveryAddressSnapshot.lon =
                  client.lon ?? client.serviceAreas?.[0]?.lon ?? null;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      setOrder(storedOrder);
      setStatus(storedOrder.status);
      setLines(storedOrder.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        sellingOptionId: line.sellingOptionId ?? line.id.replace(`${line.productId}-`, ""),
        name: line.name,
        image: line.image,
        unit: line.unit,
        minimumOrderQuantity: line.minimumOrderQuantity,
        price: line.offeredPrice,
        quantity: line.offeredQuantity,
        comment: line.comment,
      })));
    })().finally(() => {
      if (isCurrent) setIsLoadingOrder(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [orderId]);

  if (isLoadingOrder) {
    return (
      <DashboardPageContent>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
          {t("common.loading")}
        </section>
      </DashboardPageContent>
    );
  }

  if (!order) {
    return (
      <DashboardPageContent>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{t("orders.orderUnavailable")}</h1>
          <Link to="/supplier/orders" className="mt-5 inline-flex text-sm font-semibold text-primary">{t("orders.backToOrders")}</Link>
        </section>
      </DashboardPageContent>
    );
  }

  const deliveryAddress = order.deliveryAddressSnapshot ?? {
    addressId: "legacy-address",
    fullAddress: order.deliveryAddress || order.horecaAddress,
    contactPerson: order.horecaContactName,
    contactPhone: order.horecaPhone,
  };
  const customer = {
    companyName: order.horecaName,
    contactName: deliveryAddress.contactPerson || order.horecaContactName,
    email: order.horecaEmail,
    phone: deliveryAddress.contactPhone || order.horecaPhone,
    address: deliveryAddress.fullAddress || order.deliveryAddress || order.horecaAddress,
  };
  const activeOrder = order;

  const lat = deliveryAddress.lat ?? (order as any).lat ?? null;
  const lon = deliveryAddress.lon ?? (order as any).lon ?? null;
  const hasCoordinates =
    lat !== null &&
    lat !== undefined &&
    !isNaN(Number(lat)) &&
    lon !== null &&
    lon !== undefined &&
    !isNaN(Number(lon)) &&
    Number(lat) !== 0 &&
    Number(lon) !== 0;

  const rawAddressText =
    customer.address && customer.address !== "[No Address]" ? customer.address.trim() : "";
  const displayAddress =
    rawAddressText ||
    (hasCoordinates ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}` : "—");

  let mapQuery = "";
  if (hasCoordinates) {
    mapQuery = `${lat},${lon}`;
  } else if (rawAddressText) {
    const lower = rawAddressText.toLowerCase();
    if (
      lower.includes("armenia") ||
      lower.includes("yerevan") ||
      lower.includes("ереван") ||
      lower.includes("հայաստան") ||
      lower.includes("երևան")
    ) {
      mapQuery = rawAddressText;
    } else {
      mapQuery = `${rawAddressText}, Armenia`;
    }
  }

  const googleMapsEmbedUrl = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
    : "";
  const googleMapsSearchUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";
  const googleMapsDirectionsUrl = mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`
    : "";

  const isNegotiating = status === "New" || status === "Rejected";
  const canEditOffer = isNegotiating && isEditingOffer;
  const isWaiting = status === "Waiting for restaurant confirmation";
  const isInFulfilment = ["Confirmed", "Preparing", "Shipped"].includes(status);
  const isTerminal = status === "Delivered" || status === "Cancelled";
  const total = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  function updateLine(id: string, field: keyof OrderLine, value: string) {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) return line;
        if (field === "price" || field === "quantity")
          return { ...line, [field]: Number(value) };
        return { ...line, [field]: value };
      }),
    );
  }

  async function saveIndividualPrices(nextLines: StoredOrder["lines"]) {
    const pricesBySellingOption = new Map(
      nextLines.map((line) => {
        const sellingOptionId = line.sellingOptionId ?? line.id.replace(`${line.productId}-`, "");
        return [`${line.productId}:${sellingOptionId}`, line.offeredPrice];
      }),
    );
    const products = await getSupplierProducts(activeOrder.supplierAccountId);
    const updatedProducts = products.map((product) => ({
      ...product,
      sellingOptions: product.sellingOptions.map((option) => {
        const individualPrice = pricesBySellingOption.get(`${product.id}:${option.id}`);
        if (individualPrice === undefined) return option;

        return {
          ...option,
          companyPrices: [
            ...option.companyPrices.filter(
              (price) => price.resourceId !== activeOrder.horecaAccountId,
            ),
            {
              resourceId: activeOrder.horecaAccountId,
              individualPrice,
            },
          ],
        };
      }),
    }));

    await Promise.all(updatedProducts.map((product) => saveSupplierProduct(product)));
  }

  async function updateStatus(nextStatus: OrderStatus) {
    setIsSubmitting(true);
    setOfferSaveError(undefined);

    try {
      if (nextStatus === "Waiting for restaurant confirmation") {
        await backendSendPriceOffer({
          orderId: activeOrder.id,
          savePricesForCustomer: savePrices,
          items: lines.map((l) => ({
            productId: parseInt(String(l.productId).replace(/\D/g, ""), 10) || 1,
            newPrice: l.price,
            newQuantity: l.quantity,
            comment: l.comment || null,
          })),
        });
        showToast({
          title: t("orders.offerSentTitle"),
          description: t("orders.offerSentDesc"),
          variant: "success",
        });
      } else if (nextStatus === "Confirmed" && status === "New") {
        try {
          await backendAcceptOrder(activeOrder.id);
        } catch {
          await backendUpdateOrderStatus(activeOrder.id, "Confirmed");
        }
        showToast({
          title: t("orders.orderConfirmedToastTitle"),
          description: t("orders.orderConfirmedToastDesc"),
          variant: "success",
        });
      } else {
        const statusMapToBackend: Record<OrderStatus, string> = {
          New: "New",
          Confirmed: "Confirmed",
          Preparing: "InProgress",
          Shipped: "ReadyForDelivery",
          Delivered: "Delivered",
          Cancelled: "Cancelled",
          Rejected: "Rejected",
          "Waiting for restaurant confirmation": "WaitingConfirmation",
        };
        await backendUpdateOrderStatus(
          activeOrder.id,
          statusMapToBackend[nextStatus] ?? nextStatus,
        );
        showToast({
          title: t("orders.statusUpdatedTitle"),
          description: t("orders.statusUpdatedDesc", undefined, { status: getLocalizedOrderStatus(nextStatus, t) }),
          variant: "success",
        });
      }

      const nextOrder: StoredOrder = {
        ...activeOrder,
        status: nextStatus,
        offerReceivedAt:
          nextStatus === "Waiting for restaurant confirmation"
            ? new Date().toISOString()
            : activeOrder.offerReceivedAt,
        lines: activeOrder.lines.map((line) => {
          const editedLine = lines.find((candidate) => candidate.id === line.id);
          return editedLine
            ? {
                ...line,
                offeredPrice: editedLine.price,
                offeredQuantity: editedLine.quantity,
                comment: editedLine.comment,
              }
            : line;
        }),
      };

      await Promise.all([
        saveOrder(nextOrder),
        nextStatus === "Waiting for restaurant confirmation" && savePrices
          ? saveIndividualPrices(nextOrder.lines)
          : Promise.resolve(),
      ]);

      setOrder(nextOrder);
      setStatus(nextStatus);
      if (nextStatus === "Waiting for restaurant confirmation") {
        setIsEditingOffer(false);
      }

      // Broadcast real-time notification to client
      const displayOrderNum = activeOrder.orderNumber || activeOrder.orderNum || (!isGuid(activeOrder.id) ? activeOrder.id : "");
      const statusMeta: Record<string, { statusNum: number; title: string; desc: string }> = {
        "Waiting for restaurant confirmation": {
          statusNum: 8,
          title: t("notifications.priceOfferTitle", "Предложение цены по заказу"),
          desc: t("notifications.priceOfferDesc", { orderNum: displayOrderNum }),
        },
        Confirmed: {
          statusNum: 3,
          title: t("notifications.orderConfirmedTitle", "Заказ подтвержден поставщиком"),
          desc: t("notifications.orderConfirmedDesc", { orderNum: displayOrderNum }),
        },
        Preparing: {
          statusNum: 4,
          title: t("notifications.orderPreparingTitle", "Заказ собирается"),
          desc: t("notifications.orderPreparingDesc", { orderNum: displayOrderNum }),
        },
        Shipped: {
          statusNum: 5,
          title: t("notifications.orderShippedTitle", "Заказ в пути"),
          desc: t("notifications.orderShippedDesc", { orderNum: displayOrderNum }),
        },
        Delivered: {
          statusNum: 6,
          title: t("notifications.orderDeliveredTitle", "Заказ доставлен"),
          desc: t("notifications.orderDeliveredDesc", { orderNum: displayOrderNum }),
        },
        Rejected: {
          statusNum: 7,
          title: t("notifications.orderRejectedTitle", "Заказ отклонен"),
          desc: t("notifications.orderRejectedDesc", { orderNum: displayOrderNum }),
        },
        Cancelled: {
          statusNum: 7,
          title: t("notifications.orderCancelledTitle", "Заказ отменен"),
          desc: t("notifications.orderCancelledDesc", { orderNum: displayOrderNum }),
        },
      };

      const meta = statusMeta[nextStatus] || {
        statusNum: 1,
        title: `${t("notifications.statusUpdate", "Обновление")}: ${nextStatus}`,
        desc: displayOrderNum ? `#${displayOrderNum} → ${nextStatus}` : nextStatus,
      };

      broadcastOrderNotification({
        orderId: activeOrder.id,
        orderNum: displayOrderNum || undefined,
        title: meta.title,
        message: meta.desc,
        status: meta.statusNum,
        deepLink: `/horeca/orders/${activeOrder.id}`,
        targetRole: "horeca",
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Couldn't update order status.";
      setOfferSaveError(errorMsg);
      showToast({
        title: t("orders.actionFailed"),
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAssignEmployee(employeeId: string) {
    if (!employeeId) return;
    const target = employeeOptions.find((e) => e.id === employeeId);
    setIsSubmitting(true);
    try {
      await backendAssignOrder(activeOrder.id, employeeId);
      setAssignedTo(target?.name ?? employeeId);
      setAssignedEmployeeId(employeeId);
      showToast({
        title: t("orders.employeeAssignedTitle"),
        description: t("orders.employeeAssignedDesc", undefined, { name: target?.name ?? "employee" }),
        variant: "success",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to assign employee.";
      showToast({
        title: t("orders.assignmentError"),
        description: msg,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardPageContent className="pb-10">
      <DashboardPageHeader className="mb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/supplier/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> {t("orders.backToOrders")}
          </Link>
          <OrderHeaderActions
            status={status}
            isEditingOffer={isEditingOffer}
            isWarehouseManager={isWarehouseManager}
            isSubmitting={isSubmitting}
            onStatusChange={updateStatus}
            onEditingOfferChange={setIsEditingOffer}
            t={t}
          />
        </div>
        {offerSaveError ? <p role="alert" className="mt-3 text-sm text-rose-700">{offerSaveError}</p> : null}
      </DashboardPageHeader>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {t("orders.title")} {order.orderNumber || order.orderNum || (orderId ?? "ORD-9107")}
              </h1>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
              >
                {getLocalizedOrderStatus(status, t)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {customer.companyName} · {t("orders.placedAtDate", undefined, { date: formatDate(order.placedAt) })}
            </p>
          </div>
        </div>
      </header>

      {isWaiting ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <p className="font-semibold">{t("orders.waitingRestaurantConfirmation")}</p>
            <p className="mt-0.5 text-sm text-sky-800">
              {t("orders.waitingRestaurantConfirmationDesc")}
            </p>
          </div>
        </div>
      ) : null}

      {isNegotiating ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">{t("orders.actionRequiredCounterOffer")}</p>
            <p className="mt-0.5 text-sm text-amber-800">
              {canEditOffer
                ? t("orders.adjustQuantitiesSubtitle")
                : status === "Rejected"
                  ? t("orders.orderRejectedNotice", undefined, { supplier: customer.companyName })
                  : t("orders.acceptToMoveOrderSubtitle")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <SectionLabel>{t("orders.orderItems")}</SectionLabel>
                <p className="mt-1 text-sm text-slate-600">
                  {canEditOffer
                    ? t("orders.adjustQuantitiesSubtitle")
                    : t("orders.whatYouAskedForPricesConfirmed")}
                </p>
              </div>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(total)}</p>
            </div>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-2xl border-collapse text-left text-sm">
                <thead className="sticky top-0 z-20 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-64 whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
                      {t("common.product")}
                    </th>
                    <th className="min-w-32 whitespace-nowrap px-4 py-3">{t("common.price")} (AMD)</th>
                    <th className="min-w-24 whitespace-nowrap px-4 py-3">{t("common.quantity")}</th>
                    <th className="min-w-56 whitespace-nowrap px-4 py-3">{t("common.comment")}</th>
                    <th className="min-w-32 whitespace-nowrap px-6 py-3 text-right">{t("common.amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-5 py-4 transition-colors sm:px-6">
                        <div className="flex min-w-52 items-center gap-3">
                          {line.image ? (
                            <img
                              src={line.image}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                              <Package className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {line.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {line.unit}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {t("orders.minimumOrderQuantity")} {line.minimumOrderQuantity}{" "}
                              {line.minimumOrderQuantity === 1 ? t("common.unit") : t("common.units")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="min-w-32 px-4 py-4">
                        {canEditOffer ? (
                          <Input
                            aria-label={`Price for ${line.name}`}
                            value={line.price}
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(event) =>
                              updateLine(line.id, "price", event.target.value)
                            }
                            size="sm"
                            className="h-9 w-20 px-2"
                          />
                        ) : (
                          <span className="font-medium text-slate-700">
                            {formatCurrency(line.price)}
                          </span>
                        )}
                      </td>
                      <td className="min-w-24 px-4 py-4">
                        {canEditOffer ? (
                          <Input
                            aria-label={`Quantity for ${line.name}`}
                            value={line.quantity}
                            type="number"
                            min="0"
                            onChange={(event) =>
                              updateLine(
                                line.id,
                                "quantity",
                                event.target.value,
                              )
                            }
                            size="sm"
                            className="h-9 w-16 px-2"
                          />
                        ) : (
                          <span className="font-medium text-slate-700">
                            {line.quantity}
                          </span>
                        )}
                      </td>
                      <td className="min-w-56 px-4 py-4">
                        {canEditOffer ? (
                          <Input
                            aria-label={`Comment for ${line.name}`}
                            value={line.comment}
                            onChange={(event) =>
                              updateLine(line.id, "comment", event.target.value)
                            }
                            placeholder={t("orders.addNote")}
                            size="sm"
                            className="h-9 px-2"
                          />
                        ) : (
                          <span className="text-slate-500">
                            {line.comment || "—"}
                          </span>
                        )}
                      </td>
                      <td className="min-w-32 px-6 py-4 text-right font-semibold text-slate-800">
                        {formatCurrency(line.price * line.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {canEditOffer ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionLabel>{t("orders.pricingPreference")}</SectionLabel>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  checked={savePrices}
                  onChange={(event) => setSavePrices(event.target.checked)}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {t("orders.savePricesForCustomer")}
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {t("orders.savePricesForCustomerDesc", { company: customer.companyName })}
                  </span>
                </span>
              </label>
            </section>
          ) : null}

          {isInFulfilment ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <SectionLabel>{t("orders.deliveryProgress")}</SectionLabel>
                <p className="mt-1 text-sm text-slate-600">
                  {t("orders.acceptToMoveOrderSubtitle")}
                </p>
              </div>
              <ol
                className="mt-6 grid grid-cols-4 gap-1"
                aria-label={t("orders.deliveryProgress")}
              >
                {(
                  ["Confirmed", "Preparing", "Shipped", "Delivered"] as const
                ).map((step, index) => {
                  const positions = {
                    Confirmed: 0,
                    Preparing: 1,
                    Shipped: 2,
                    Delivered: 3,
                  };
                  const currentPosition =
                    positions[status as keyof typeof positions] ?? 0;
                  const isComplete = index <= currentPosition;
                  return (
                    <li key={step} className="min-w-0">
                      <div
                        className={`h-1.5 rounded-full ${isComplete ? "bg-primary" : "bg-slate-100"}`}
                      />
                      <p
                        className={`mt-2 text-xs font-semibold ${isComplete ? "text-slate-800" : "text-slate-400"}`}
                      >
                        {getLocalizedOrderStatus(step, t)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {/* Large Google Map directly under Delivery Progress */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <SectionLabel>{t("orders.deliveryLocation")}</SectionLabel>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {displayAddress}
                  {deliveryAddress.label ? (
                    <span className="ml-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                      📍 {deliveryAddress.label}
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {rawAddressText ? (
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(rawAddressText)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
                  >
                    {hasCopiedAddress ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">{t("common.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t("orders.copyAddress")}</span>
                      </>
                    )}
                  </button>
                ) : null}

                {mapQuery ? (
                  <>
                    <a
                      href={googleMapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                      <span>Google Maps</span>
                    </a>
                    <a
                      href={googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-content shadow-xs transition hover:brightness-95"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>{t("orders.route")}</span>
                    </a>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsMapExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                  title={isMapExpanded ? t("common.collapse") : t("common.expand")}
                >
                  {isMapExpanded ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
                      <span className="hidden sm:inline">{t("common.collapse")}</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                      <span className="hidden sm:inline">{t("common.expand")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Google Map with zoom, scroll, and satellite */}
            <div className="relative bg-slate-100">
              {mapQuery || hasCoordinates ? (
                <ArmeniaMapPicker
                  value={{
                    lat: hasCoordinates ? Number(lat) : null,
                    lon: hasCoordinates ? Number(lon) : null,
                  }}
                  initialAddressQuery={rawAddressText}
                  readOnly={true}
                  height={isMapExpanded ? "700px" : "520px"}
                  className="rounded-none border-0 shadow-none"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-400">
                  <MapPin className="mb-2 h-10 w-10 stroke-1 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    {t("orders.deliveryPointNotSpecified")}
                  </p>
                </div>
              )}
            </div>

            {/* Details strip below map */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <strong className="text-slate-800">{customer.companyName || t("common.customer")}</strong>
                </span>
                {customer.contactName ? (
                  <span className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{customer.contactName}</span>
                  </span>
                ) : null}
                {customer.phone ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${customer.phone}`} className="font-medium text-primary hover:underline">
                      {customer.phone}
                    </a>
                  </span>
                ) : null}
              </div>

              {hasCoordinates ? (
                <span className="font-mono text-slate-500">
                  GPS: {Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}
                </span>
              ) : null}
            </div>
          </section>

          {isTerminal ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {t("orders.orderIsClosed")}
              </span>{" "}
              {t("orders.orderIsClosedDesc")}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <SectionLabel>{t("orders.deliveryAddress")}</SectionLabel>
              </div>
              {rawAddressText ? (
                <button
                  type="button"
                  onClick={() => handleCopyAddress(rawAddressText)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
                  title={t("orders.copyAddress")}
                >
                  {hasCopiedAddress ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="font-semibold text-emerald-700">{t("common.copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-slate-400" />
                      <span>{t("common.copy")}</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                <p className="font-semibold text-slate-900">{customer.companyName || t("common.customer")}</p>
              </div>
              {deliveryAddress.label ? (
                <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  📍 {deliveryAddress.label}
                </span>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium leading-snug text-slate-800">
                {displayAddress}
              </p>
              {hasCoordinates ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600 shadow-xs">
                    <span>GPS:</span>
                    <span className="font-semibold text-slate-800">
                      {Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            {mapQuery ? (
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                  <span>Google Maps</span>
                </a>
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-content shadow-xs transition hover:brightness-95"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>{t("orders.route")}</span>
                </a>
              </div>
            ) : null}

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <div className="flex items-center gap-2.5">
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="font-medium text-slate-800">
                  {customer.contactName || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 break-all">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="font-medium text-slate-700 hover:text-primary hover:underline"
                  >
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionLabel>{t("orders.assignment")}</SectionLabel>
            {assignedTo ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {assignedTo}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t("orders.assignedJustNow")}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {t("orders.noEmployeeAssigned")}
              </p>
            )}
            {!isTerminal ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  {assignedTo ? t("orders.reassignEmployee") : t("orders.assignEmployee")}
                </p>
                <Select
                  value={assignedEmployeeId || assignedTo}
                  onValueChange={(value) => handleAssignEmployee(String(value))}
                  size="sm"
                  className="mt-0"
                >
                  <option value="">{t("orders.assignEmployee")}...</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </section>
          {status === "Delivered" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex gap-2 font-semibold">
                <PackageCheck className="h-5 w-5" />
                {t("orders.customerRecordUpdated")}
              </div>
              <p className="mt-1.5">
                {t("orders.customerRecordUpdatedDesc")}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </DashboardPageContent>
  );
}
