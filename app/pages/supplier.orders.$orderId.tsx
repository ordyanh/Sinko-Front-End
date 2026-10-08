import {
  ArrowLeft,
  CircleCheck,
  ChevronRight,
  ClipboardList,
  CircleAlert,
  Clock3,
  Mail,
  MapPin,
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
import { DashboardPageContent, DashboardPageHeader } from "~/shared/ui";
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
import { getEmployeesList, type EmployeeListItem } from "~/shared/api/employee";
import type { StoredEmployee } from "~/shared/lib/indexed-db";
import { getCurrentUserEmployeeRole } from "~/shared/lib/auth-token";

type OrderStatus =
  | "New"
  | "Rejected"
  | "Waiting for restaurant confirmation"
  | "Confirmed"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

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
  return new Date(date).toLocaleDateString("en-US", {
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
}: {
  status: OrderStatus;
  isEditingOffer: boolean;
  isWarehouseManager: boolean;
  isSubmitting: boolean;
  onStatusChange: (status: OrderStatus) => void;
  onEditingOfferChange: (isEditing: boolean) => void;
}) {
  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    Confirmed: "Preparing",
    Preparing: "Shipped",
    Shipped: "Delivered",
  };

  if (status === "New" && !isEditingOffer) {
    if (isWarehouseManager) {
      return (
        <span className="text-xs italic text-slate-500">
          Warehouse managers can only advance fulfilled orders.
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
          Edit offer
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onStatusChange("Confirmed")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50"
        >
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Confirming..." : "Confirm order"}
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
          Cancel editing
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onStatusChange("Waiting for restaurant confirmation")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSubmitting
            ? "Sending..."
            : status === "Rejected"
              ? "Send revised offer"
              : "Send offer"}
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
        Edit rejected offer
      </button>
    );
  }

  const next = nextStatus[status];
  if (next) {
    return (
      <div className="flex items-center gap-3">
        {!isWarehouseManager ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onStatusChange("Cancelled")}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Cancel order
          </button>
        ) : null}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onStatusChange(next)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:opacity-50"
        >
          {isSubmitting ? "Updating..." : "Mark as " + next}
        </button>
      </div>
    );
  }

  return null;
}

export default function SupplierOrderDetailsPage() {
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
          Loading order…
        </section>
      </DashboardPageContent>
    );
  }

  if (!order) {
    return (
      <DashboardPageContent>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Order not found</h1>
          <Link to="/supplier/orders" className="mt-5 inline-flex text-sm font-semibold text-primary">Back to orders</Link>
        </section>
      </DashboardPageContent>
    );
  }

  const deliveryAddress = order.deliveryAddressSnapshot ?? {
    addressId: "legacy-address",
    fullAddress: order.deliveryAddress,
    contactPerson: order.horecaContactName,
    contactPhone: order.horecaPhone,
  };
  const customer = {
    companyName: order.horecaName,
    contactName: deliveryAddress.contactPerson,
    email: order.horecaEmail,
    phone: deliveryAddress.contactPhone,
    address: deliveryAddress.fullAddress,
  };
  const activeOrder = order;

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
          title: "Offer sent",
          description: "Your price offer has been sent to the restaurant.",
          variant: "success",
        });
      } else if (nextStatus === "Confirmed" && status === "New") {
        try {
          await backendAcceptOrder(activeOrder.id);
        } catch {
          await backendUpdateOrderStatus(activeOrder.id, "Confirmed");
        }
        showToast({
          title: "Order confirmed",
          description: "Order has been confirmed and moved to processing.",
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
          title: "Status updated",
          description: "Order marked as " + nextStatus + ".",
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
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Couldn't update order status.";
      setOfferSaveError(errorMsg);
      showToast({
        title: "Action failed",
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
        title: "Employee assigned",
        description: "Order successfully assigned to " + (target?.name ?? "employee") + ".",
        variant: "success",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to assign employee.";
      showToast({
        title: "Assignment error",
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
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
          <OrderHeaderActions
            status={status}
            isEditingOffer={isEditingOffer}
            isWarehouseManager={isWarehouseManager}
            isSubmitting={isSubmitting}
            onStatusChange={updateStatus}
            onEditingOfferChange={setIsEditingOffer}
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
                Order {orderId ?? "ORD-9107"}
              </h1>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {customer.companyName} · Created {formatDate(order.placedAt)}
            </p>
          </div>
        </div>
      </header>

      {isWaiting ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <p className="font-semibold">Waiting for restaurant confirmation</p>
            <p className="mt-0.5 text-sm text-sky-800">
              Your offer was sent on 24 August at 10:42. The order is locked
              while the restaurant reviews it.
            </p>
          </div>
        </div>
      ) : null}

      {isNegotiating ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Action required</p>
            <p className="mt-0.5 text-sm text-amber-800">
              {canEditOffer
                ? "Update the prices, quantities, and notes, then send the offer."
                : status === "Rejected"
                  ? "The restaurant rejected this offer. Edit it before sending a revision."
                  : "Confirm the order as requested, or edit it to create an offer."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <SectionLabel>Order items</SectionLabel>
                <p className="mt-1 text-sm text-slate-600">
                  {canEditOffer
                    ? "Edit the offer the restaurant will receive."
                    : "Final product quantities and agreed prices."}
                </p>
              </div>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(total)}</p>
            </div>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-2xl border-collapse text-left text-sm">
                <thead className="sticky top-0 z-20 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-64 whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
                      Product
                    </th>
                    <th className="min-w-32 whitespace-nowrap px-4 py-3">Price (AMD)</th>
                    <th className="min-w-24 whitespace-nowrap px-4 py-3">Qty</th>
                    <th className="min-w-56 whitespace-nowrap px-4 py-3">Comment</th>
                    <th className="min-w-32 whitespace-nowrap px-6 py-3 text-right">Amount</th>
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
                              Minimum order: {line.minimumOrderQuantity} {line.minimumOrderQuantity === 1 ? "unit" : "units"}
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
                            placeholder="Add a note"
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
              <SectionLabel>Pricing preference</SectionLabel>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  checked={savePrices}
                  onChange={(event) => setSavePrices(event.target.checked)}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Save prices for this customer
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Use these prices as a starting point for the next order from{" "}
                    {customer.companyName}.
                  </span>
                </span>
              </label>
            </section>
          ) : null}

          {isInFulfilment ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <SectionLabel>Fulfilment</SectionLabel>
                <p className="mt-1 text-sm text-slate-600">
                  Move this order through its physical delivery stages from the
                  actions above.
                </p>
              </div>
              <ol
                className="mt-6 grid grid-cols-4 gap-1"
                aria-label="Fulfilment progress"
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
                        {step}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {isTerminal ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                This order is closed.
              </span>{" "}
              Its status and line items can no longer be changed.
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionLabel>Delivery address</SectionLabel>
            <p className="mt-3 font-semibold text-slate-900">
              {customer.companyName}
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {deliveryAddress.label ? (
                <p className="font-semibold text-slate-900">{deliveryAddress.label}</p>
              ) : null}
              <p className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {customer.address}
              </p>
              <p className="flex gap-2">
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                {customer.contactName}
              </p>
              <p className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                {customer.phone}
              </p>
              <p className="flex gap-2 break-all">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                {customer.email}
              </p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionLabel>Assignment</SectionLabel>
            {assignedTo ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {assignedTo}
                </p>
                <p className="mt-1 text-xs text-slate-500">Assigned just now</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No employee is assigned to this order.
              </p>
            )}
            {!isTerminal ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  {assignedTo ? "Reassign employee" : "Assign employee"}
                </p>
                <Select
                  value={assignedEmployeeId || assignedTo}
                  onValueChange={(value) => handleAssignEmployee(String(value))}
                  size="sm"
                  className="mt-0"
                >
                  <option value="">Assign employee...</option>
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
                Customer record updated
              </div>
              <p className="mt-1.5">
                This completed order is available in the restaurant’s customer
                history.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </DashboardPageContent>
  );
}
