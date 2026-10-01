import { ClipboardList, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  formatAmd,
  formatAmdDelta,
  formatOrderDate,
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
  type HorecaOrderStatus,
} from "~/entities/horeca";
import { getLoggedInUser, getOrdersForHoreca } from "~/shared/lib/indexed-db";
import {
  DashboardTableContent,
  TableLayout,
  type TableColumn,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";

const pageSize = 5;

const statusFilterOptions: Array<{ value: HorecaOrderStatus; label: string }> = (
  [
    "Waiting for restaurant confirmation",
    "New",
    "Rejected",
    "Confirmed",
    "Preparing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ] as const
).map((status) => ({ value: status, label: horecaOrderStatusLabels[status] }));

function FulfilmentMeter({ status }: { status: HorecaOrderStatus }) {
  const currentStep = fulfilmentSteps.indexOf(
    status as (typeof fulfilmentSteps)[number],
  );

  if (currentStep < 0) return null;

  return (
    <span
      className="mt-2 flex w-24 gap-0.5"
      role="img"
      aria-label={`Step ${currentStep + 1} of ${fulfilmentSteps.length}: ${status}`}
    >
      {fulfilmentSteps.map((step, index) => (
        <span
          key={step}
          className={`h-1 flex-1 rounded-full ${
            index <= currentStep ? "bg-slate-400" : "bg-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

const columns: TableColumn<HorecaOrder>[] = [
  {
    id: "order",
    header: "Order",
    cell: (order) => (
      <div>
        <span className="font-semibold text-slate-900 tabular-nums">
          {order.id}
        </span>
        <p className="mt-0.5 text-xs text-slate-500">
          Placed {formatOrderDate(order.placedAt)}
        </p>
      </div>
    ),
  },
  {
    id: "supplier",
    header: "Supplier",
    cell: (order) => (
      <div>
        <p className="font-medium text-slate-800">{order.supplierName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {order.supplierContactName}
        </p>
      </div>
    ),
  },
  {
    id: "items",
    header: "Items",
    cell: (order) => {
      const shortLineCount = getShortLineCount(order.lines);

      return (
        <div>
          <span className="tabular-nums">{order.lines.length}</span>
          {shortLineCount > 0 ? (
            <p className="mt-0.5 text-xs font-medium text-rose-600">
              {shortLineCount} short
            </p>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "delivery",
    header: "Delivery",
    cell: (order) => formatOrderDate(order.deliveryDate),
  },
  {
    id: "status",
    header: "Status",
    cell: (order) => (
      <div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${horecaOrderStatusClasses[order.status]}`}
        >
          {horecaOrderStatusLabels[order.status]}
        </span>
        <FulfilmentMeter status={order.status} />
      </div>
    ),
  },
  {
    id: "total",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right",
    cell: (order) => {
      const offeredTotal = getOfferedTotal(order.lines);
      const delta = offeredTotal - getRequestedTotal(order.lines);
      const tone = getOfferTone(delta, getShortLineCount(order.lines));
      const hasOffer = order.offerReceivedAt !== null;

      return (
        <div>
          <p className="font-semibold text-slate-900 tabular-nums">
            {formatAmd(offeredTotal)}
          </p>
          {hasOffer && delta !== 0 ? (
            <p
              className={`mt-0.5 text-xs font-medium tabular-nums ${offerToneClasses[tone]}`}
            >
              {formatAmdDelta(delta)} vs requested
            </p>
          ) : null}
        </div>
      );
    },
  },
];

export default function HorecaOrdersPage() {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<HorecaOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "horeca") return;
      const storedOrders = await getOrdersForHoreca(user.id);
      if (isCurrent) setOrders(storedOrders);
    })().finally(() => {
      if (isCurrent) setIsLoadingOrders(false);
    });

    return () => {
      isCurrent = false;
    };
  }, []);
  const supplierNameFromUrl = searchParams.get("supplier");
  const supplierIdFromUrl = searchParams.get("supplierId");
  const orderSearchFilters: SearchFilterDefinition[] = [
    {
      id: "status",
      label: "Status",
      options: statusFilterOptions,
    },
    {
      id: "supplier",
      label: "Supplier",
      options: Array.from(new Set(orders.map((order) => order.supplierName))).map(
        (supplier) => ({ value: supplier, label: supplier }),
      ),
    },
  ];

  useEffect(() => {
    const selectedSupplierName = supplierNameFromUrl ?? orders.find(
      (order) => order.supplierId === supplierIdFromUrl,
    )?.supplierName;

    setSelectedFilters(
      selectedSupplierName
        ? [
            {
              id: "supplier-from-directory",
              filterId: "supplier",
              operator: "is",
              value: selectedSupplierName,
            },
          ]
        : [],
    );
    setPage(1);
  }, [orders, supplierIdFromUrl, supplierNameFromUrl]);
  const awaitingReviewCount = orders.filter((order) =>
    isOfferEditable(order.status),
  ).length;
  const isReviewFilterOn = selectedFilters.some(
    (filter) =>
      filter.filterId === "status" &&
      filter.operator === "is" &&
      filter.value === "Waiting for restaurant confirmation",
  );

  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = [
      order.id,
      order.supplierName,
      order.supplierContactName,
      horecaOrderStatusLabels[order.status],
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchValue);
    const matchesFilters = selectedFilters.every((filter) => {
      const orderValue =
        filter.filterId === "status" ? order.status : order.supplierName;
      const doesMatch = orderValue === filter.value;

      return filter.operator === "is" ? doesMatch : !doesMatch;
    });

    return matchesSearch && matchesFilters;
  });
  const visibleOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPage(1);
  }

  function handleSelectedFiltersChange(filters: SearchFilterValue[]) {
    setSelectedFilters(filters);
    setPage(1);
  }

  function showReviewOrders() {
    setSelectedFilters((current) => [
      ...current.filter((filter) => filter.filterId !== "status"),
      {
        id: "review-orders-status",
        filterId: "status",
        operator: "is",
        value: "Waiting for restaurant confirmation",
      },
    ]);
    setPage(1);
  }

  function clearReviewOrdersFilter() {
    setSelectedFilters((current) =>
      current.filter((filter) => filter.filterId !== "status"),
    );
    setPage(1);
  }

  return (
    <DashboardTableContent>
      <TableLayout
        title="Orders"
        icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        additionalContent={
          awaitingReviewCount > 0 || isReviewFilterOn ? (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-slate-700"
            >
              <span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {awaitingReviewCount}
                </span>{" "}
                {awaitingReviewCount === 1 ? "offer needs" : "offers need"} your
                review before the supplier can prepare{" "}
                {awaitingReviewCount === 1 ? "it" : "them"}.
              </span>
              {isReviewFilterOn ? (
                <button
                  type="button"
                  onClick={clearReviewOrdersFilter}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-primary/10 hover:text-slate-900"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Show all orders
                </button>
              ) : (
                <button
                  type="button"
                  onClick={showReviewOrders}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
                >
                  Review offers
                </button>
              )}
            </div>
          ) : null
        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by order, supplier, or status"
        searchFilters={orderSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        columns={columns}
        rows={visibleOrders}
        getRowKey={(order) => order.id}
        rowLink={(order) => `/horeca/orders/${order.id}`}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalCount={filteredOrders.length}
        emptyMessage={isLoadingOrders ? "Loading orders…" : "No orders match your search."}
      />
    </DashboardTableContent>
  );
}
