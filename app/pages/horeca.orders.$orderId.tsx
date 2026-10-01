import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Gift,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  formatAmd,
  formatAmdDelta,
  formatOrderDate,
  formatOrderDateTime,
  fulfilmentSteps,
  getOfferedTotal,
  getOfferTone,
  getRequestedTotal,
  getShortLineCount,
  offerToneClasses,
  horecaOrderStatusClasses,
  horecaOrderStatusLabels,
  isOfferEditable,
  type HorecaOrder,
  type HorecaOrderLine,
  type HorecaOrderStatus,
} from "~/entities/horeca";
import { getLoggedInUser, getOrderForHoreca, saveOrder, type StoredOrder } from "~/shared/lib/indexed-db";
import { DashboardPageContent, DashboardPageHeader } from "~/shared/ui";
import { Input } from "~/shared/ui/form";
import { useToast } from "~/shared/ui/toast";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </p>
  );
}

// Dearer than requested is bad news for the restaurant, cheaper is good — unless
// the saving only comes from a line the supplier could not fill.
function DeltaText({
  delta,
  shortLineCount,
  className = "",
}: {
  delta: number;
  shortLineCount: number;
  className?: string;
}) {
  if (delta === 0) return null;

  return (
    <span
      className={`font-medium tabular-nums ${offerToneClasses[getOfferTone(delta, shortLineCount)]} ${className}`}
    >
      {formatAmdDelta(delta)}
    </span>
  );
}

function StatusBanner({
  order,
  isEditing,
}: {
  order: HorecaOrder;
  isEditing: boolean;
}) {
  const supplierNote = [...order.history]
    .reverse()
    .find((event) => event.actor === "supplier")?.note;

  if (isOfferEditable(order.status)) {
    return (
      <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4">
        <p className="font-semibold text-slate-900">
          {isEditing
            ? "Sending changes back"
            : `Offer received ${order.offerReceivedAt ? formatOrderDateTime(order.offerReceivedAt) : ""}`}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {isEditing
            ? "Adjust quantities, prices and notes, then send them to the supplier."
            : "Accept it to move the order into preparation, or send back the changes you need."}
        </p>
        {supplierNote && !isEditing ? (
          <p className="mt-3 border-l-2 border-primary/30 pl-3 text-sm italic text-slate-600">
            “{supplierNote}” — {order.supplierContactName}
          </p>
        ) : null}
      </div>
    );
  }

  const message: Partial<Record<HorecaOrderStatus, string>> = {
    New: `${order.supplierName} has not sent an offer yet. You will be able to review it here.`,
    Rejected: `Your changes are with ${order.supplierName}. They will send a revised offer for you to review.`,
    Confirmed: `${order.supplierName} confirmed this order and will start preparing it.`,
    Preparing: `${order.supplierName} is preparing this order for ${formatOrderDate(order.deliveryDate)}.`,
    Shipped: `This order is on its way and is due ${formatOrderDate(order.deliveryDate)}.`,
    Delivered: `Delivered on ${formatOrderDate(order.deliveryDate)}. Prices and quantities are final.`,
    Cancelled: "This order was cancelled. Nothing was delivered or charged.",
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
      {message[order.status]}
    </div>
  );
}

function FulfilmentProgress({ status }: { status: HorecaOrderStatus }) {
  const currentStep = fulfilmentSteps.indexOf(
    status as (typeof fulfilmentSteps)[number],
  );

  if (currentStep < 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionLabel>Delivery progress</SectionLabel>
      <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Delivery progress">
        {fulfilmentSteps.map((step, index) => {
          const isComplete = index <= currentStep;

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
  );
}

export default function HorecaOrderDetailsPage() {
  const { orderId } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  const [status, setStatus] = useState<HorecaOrderStatus>(
    "New",
  );
  const [lines, setLines] = useState<HorecaOrderLine[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [messageToSupplier, setMessageToSupplier] = useState("");

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "horeca" || !orderId) return;
      const storedOrder = await getOrderForHoreca(user.id, orderId);
      if (!isCurrent || !storedOrder) return;
      setOrder(storedOrder);
      setStatus(storedOrder.status);
      setLines(storedOrder.lines);
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
          <h1 className="text-lg font-semibold text-slate-900">
            This order is no longer available
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            It may have been removed by your supplier.
          </p>
          <Link
            to="/horeca/orders"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to orders
          </Link>
        </section>
      </DashboardPageContent>
    );
  }

  // Narrowed once the missing-order guard above has run, so the handlers below
  // can read the order without re-checking it.
  const activeOrder = order;
  const canRespond = isOfferEditable(status);
  const hasOffer = order.offerReceivedAt !== null;
  const requestedTotal = getRequestedTotal(lines);
  const offeredTotal = getOfferedTotal(lines);
  const totalDelta = offeredTotal - requestedTotal;
  const shortLineCount = getShortLineCount(lines);
  const history = order.history;
  // Orders written before delivery snapshots existed remain readable, while
  // every new order renders the immutable destination captured at checkout.
  const deliveryAddress = order.deliveryAddressSnapshot ?? {
    addressId: "legacy-address",
    fullAddress: order.deliveryAddress,
    contactPerson: order.horecaContactName,
    contactPhone: order.horecaPhone,
  };

  function updateLine(
    lineId: string,
    field: "offeredQuantity" | "offeredPrice" | "comment",
    value: string,
  ) {
    setLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== lineId) return line;
        if (field === "comment") return { ...line, comment: value };

        return { ...line, [field]: Math.max(0, Number(value) || 0) };
      }),
    );
  }

  function acceptOffer() {
    const nextOrder = {
      ...activeOrder,
      status: "Confirmed" as const,
      history: [...activeOrder.history, { id: `restaurant-confirmed-${Date.now()}`, actor: "restaurant" as const, label: "Offer accepted", date: new Date().toISOString() }],
    };
    setOrder(nextOrder);
    setStatus(nextOrder.status);
    setIsEditing(false);
    void saveOrder(nextOrder).catch(() => {
      showToast({ title: "Couldn't save order", description: "Please try accepting the offer again.", variant: "error" });
    });
    showToast({
      title: "Offer accepted",
      description: `${activeOrder.supplierName} will start preparing order ${activeOrder.id}.`,
      variant: "success",
    });
  }

  function cancelEditing() {
    setLines(activeOrder.lines);
    setMessageToSupplier("");
    setIsEditing(false);
  }

  function sendChanges() {
    const nextOrder = {
      ...activeOrder,
      status: "Rejected" as const,
      lines,
      history: [...activeOrder.history, { id: `restaurant-changes-${Date.now()}`, actor: "restaurant" as const, label: "Changes sent back", date: new Date().toISOString(), note: messageToSupplier || undefined }],
    };
    setOrder(nextOrder);
    setStatus(nextOrder.status);
    setIsEditing(false);
    void saveOrder(nextOrder).catch(() => {
      showToast({ title: "Couldn't save order", description: "Please try sending your changes again.", variant: "error" });
    });
    showToast({
      title: "Changes sent",
      description: `${activeOrder.supplierName} will review your changes and send a revised offer.`,
      variant: "success",
    });
  }

  return (
    <DashboardPageContent className="pb-10">
      <DashboardPageHeader className="mb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/horeca/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to orders
          </Link>

          {canRespond ? (
            <div className="flex flex-wrap items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={sendChanges}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send changes to supplier
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={acceptOffer}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
                  >
                    <CircleCheck className="h-4 w-4" aria-hidden="true" />
                    Accept offer
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </DashboardPageHeader>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Order {order.id}
              </h1>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${horecaOrderStatusClasses[status]}`}
              >
                {horecaOrderStatusLabels[status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {order.supplierName} · Placed {formatOrderDate(order.placedAt)}
            </p>
          </div>
        </div>
      </header>

      <StatusBanner order={{ ...order, status }} isEditing={isEditing} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <SectionLabel>Order items</SectionLabel>
                <p className="mt-1 text-sm text-slate-600">
                  {isEditing
                    ? "Set the quantities and prices you can accept."
                    : hasOffer
                      ? "What you asked for, next to what the supplier offered."
                      : "What you asked for. Prices are confirmed when the offer arrives."}
                </p>
              </div>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">
                {formatAmd(offeredTotal)}
              </p>
            </div>

            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-56 whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
                      Product
                    </th>
                    <th className="min-w-32 whitespace-nowrap border-b border-slate-200 px-4 py-3.5">
                      You requested
                    </th>
                    {hasOffer ? (
                      <th className="min-w-48 whitespace-nowrap border-b border-slate-200 px-4 py-3.5">
                        {isEditing ? "Your counter" : "Supplier offer"}
                      </th>
                    ) : null}
                    <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3.5">
                      Comment
                    </th>
                    <th className="min-w-32 whitespace-nowrap border-b border-slate-200 px-6 py-3.5 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => {
                    const requestedAmount =
                      line.requestedPrice * line.requestedQuantity;
                    const offeredAmount = line.offeredPrice * line.offeredQuantity;

                    return (
                      <tr key={line.id}>
                        <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-5 py-4 sm:px-6">
                          <div className="flex min-w-44 items-center gap-3">
                            <img
                              src={line.image}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {line.name}
                              </p>
                              {line.isPromotionGift ? (
                                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700"><Gift className="h-3 w-3" aria-hidden="true" />Free gift{line.promotionTitle ? ` · ${line.promotionTitle}` : ""}</p>
                              ) : null}
                              <p className="mt-0.5 text-xs text-slate-500">
                                {line.unit}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                Minimum order: {line.minimumOrderQuantity} {line.minimumOrderQuantity === 1 ? "unit" : "units"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-500 tabular-nums">
                          {line.isPromotionGift ? `${line.requestedQuantity} free × 0 դրամ` : `${line.requestedQuantity} × ${formatAmd(line.requestedPrice)}`}
                        </td>

                        {hasOffer ? (
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  aria-label={`Quantity for ${line.name}`}
                                  value={line.offeredQuantity}
                                  type="number"
                                  min="0"
                                  onChange={(event) =>
                                    updateLine(
                                      line.id,
                                      "offeredQuantity",
                                      event.target.value,
                                    )
                                  }
                                  size="sm"
                                  className="h-9 w-16 px-2"
                                />
                                <span className="text-slate-400">×</span>
                                <Input
                                  aria-label={`Price for ${line.name}`}
                                  value={line.offeredPrice}
                                  type="number"
                                  min="0"
                                  step="100"
                                  onChange={(event) =>
                                    updateLine(
                                      line.id,
                                      "offeredPrice",
                                      event.target.value,
                                    )
                                  }
                                  size="sm"
                                  className="h-9 w-24 px-2"
                                />
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-slate-800 tabular-nums">
                                  {line.offeredQuantity} ×{" "}
                                  {formatAmd(line.offeredPrice)}
                                </p>
                                {line.offeredQuantity !==
                                line.requestedQuantity ? (
                                  <p className="mt-0.5 text-xs font-medium text-rose-600">
                                    {line.requestedQuantity -
                                      line.offeredQuantity}{" "}
                                    short of your request
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </td>
                        ) : null}

                        <td className="px-4 py-4">
                          {isEditing ? (
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

                        <td className="px-6 py-4 text-right">
                          <p className="font-semibold text-slate-800 tabular-nums">
                            {formatAmd(offeredAmount)}
                          </p>
                          {hasOffer ? (
                            <DeltaText
                              delta={offeredAmount - requestedAmount}
                              shortLineCount={
                                line.offeredQuantity < line.requestedQuantity
                                  ? 1
                                  : 0
                              }
                              className="mt-0.5 block text-xs"
                            />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasOffer ? (
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                <dl className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex items-baseline justify-between gap-6">
                    <dt className="text-slate-500">You requested</dt>
                    <dd className="tabular-nums text-slate-600">
                      {formatAmd(requestedTotal)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-6">
                    <dt className="text-slate-500">
                      {isEditing ? "Your counter" : "Supplier offer"}
                    </dt>
                    <dd className="font-semibold tabular-nums text-slate-900">
                      {formatAmd(offeredTotal)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-6 border-t border-slate-200 pt-2">
                    <dt className="text-slate-500">Difference</dt>
                    <dd>
                      {totalDelta === 0 ? (
                        <span className="tabular-nums text-slate-500">
                          No change
                        </span>
                      ) : (
                        <DeltaText
                          delta={totalDelta}
                          shortLineCount={shortLineCount}
                        />
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </section>

          {isEditing ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionLabel>Message to supplier</SectionLabel>
              <p className="mt-1 text-sm text-slate-600">
                Explain what you changed so {order.supplierContactName} can
                respond quickly.
              </p>
              <textarea
                value={messageToSupplier}
                onChange={(event) => setMessageToSupplier(event.target.value)}
                rows={3}
                placeholder="We need the full six crates for the weekend service."
                className="mt-4 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 focus:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </section>
          ) : null}

          <FulfilmentProgress status={status} />
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionLabel>Supplier</SectionLabel>
            <p className="mt-3 font-semibold text-slate-900">
              {order.supplierName}
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="flex gap-2">
                <UserRound
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {order.supplierContactName}
              </p>
              <p className="flex gap-2">
                <Phone
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {order.supplierPhone}
              </p>
              <p className="flex gap-2 break-all">
                <Mail
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {order.supplierEmail}
              </p>
              <p className="flex gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {order.supplierAddress}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionLabel>Delivery</SectionLabel>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p className="flex gap-2">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    {formatOrderDate(order.deliveryDate)}
                  </span>
                  <span className="text-xs text-slate-500">
                    Requested delivery date
                  </span>
                </span>
              </p>
              <p className="flex gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>
                  {deliveryAddress.label ? (
                    <span className="block font-semibold text-slate-900">{deliveryAddress.label}</span>
                  ) : null}
                  <span className="block">{deliveryAddress.fullAddress}</span>
                  <span className="mt-1 block text-xs text-slate-500">Contact: {deliveryAddress.contactPerson} · {deliveryAddress.contactPhone}</span>
                </span>
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionLabel>Activity</SectionLabel>
            <ol className="mt-4 space-y-4">
              {history.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      event.actor === "restaurant"
                        ? "bg-primary"
                        : "bg-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {event.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatOrderDateTime(event.date)}
                    </p>
                    {event.note ? (
                      <p className="mt-1.5 text-xs text-slate-600">
                        {event.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </DashboardPageContent>
  );
}
