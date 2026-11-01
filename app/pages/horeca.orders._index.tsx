import { ClipboardList, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation, getLocalizedOrderStatus } from "~/shared/lib/i18n";
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

export default function HorecaOrdersPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orders, setOrders] = useState<HorecaOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const columns: TableColumn<HorecaOrder>[] = useMemo(
    () => [
      {
        id: "order",
        header: t("orders.orderId"),
        cell: (order) => (
          <div>
            <span className="font-semibold text-slate-900 tabular-nums">
              {order.orderNumber || order.orderNum || order.id}
            </span>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("orders.placedAtDate", "Placed")} {formatOrderDate(order.placedAt)}
            </p>
          </div>
        ),
      },
      {
        id: "supplier",
        header: t("orders.supplier"),
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
        header: t("orders.items"),
        cell: (order) => {
          const shortLineCount = getShortLineCount(order.lines);

          return (
            <div>
              <span className="tabular-nums">{order.lines.length}</span>
              {shortLineCount > 0 ? (
                <p className="mt-0.5 text-xs font-medium text-rose-600">
                  {shortLineCount} {t("orders.shortCount", "short")}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "delivery",
        header: t("orders.date"),
        cell: (order) => formatOrderDate(order.deliveryDate),
      },
      {
        id: "status",
        header: t("orders.status"),
        cell: (order) => (
          <div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${horecaOrderStatusClasses[order.status]}`}
            >
              {getLocalizedOrderStatus(order.status, t)}
            </span>
            <FulfilmentMeter status={order.status} />
          </div>
        ),
      },
      {
        id: "total",
        header: t("orders.total"),
        headerClassName: "text-right",
        className: "text-right",
        cell: (order) => {
          const calculatedOffered = getOfferedTotal(order.lines);
          const offeredTotal = calculatedOffered > 0
            ? calculatedOffered
            : (order.finalPrice ?? order.totalPrice ?? order.totalAmount ?? 0);
          const calculatedRequested = getRequestedTotal(order.lines);
          const requestedTotal = calculatedRequested > 0
            ? calculatedRequested
            : (order.totalPrice ?? order.finalPrice ?? order.totalAmount ?? 0);
          const delta = offeredTotal - requestedTotal;
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
                  {formatAmdDelta(delta)} {t("orders.vsRequested", "vs requested")}
                </p>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t],
  );

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
      label: t("orders.status", "Status"),
      options: statusFilterOptions,
    },
    {
      id: "supplier",
      label: t("orders.supplier", "Supplier"),
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
  const activeStatusFilter =
    selectedFilters.find(
      (f) => f.filterId === "status" && f.operator === "is",
    )?.value ?? "All";

  const quickStatusTabs = useMemo(() => {
    const countBy = (statuses: HorecaOrderStatus[]) =>
      orders.filter((o) => statuses.includes(o.status)).length;
    return [
      { id: "All", label: t("common.all", "All"), count: orders.length },
      {
        id: "Waiting for restaurant confirmation",
        label: horecaOrderStatusLabels["Waiting for restaurant confirmation"],
        count: countBy(["Waiting for restaurant confirmation"]),
        highlight: true,
      },
      { id: "New", label: t("orders.statusNew", "New"), count: countBy(["New"]) },
      {
        id: "Confirmed",
        label: t("orders.statusConfirmed", "Confirmed"),
        count: countBy(["Confirmed"]),
      },
      {
        id: "Preparing",
        label: t("orders.statusPreparing", "Preparing"),
        count: countBy(["Preparing"]),
      },
      {
        id: "Shipped",
        label: t("orders.statusShipped", "Shipped"),
        count: countBy(["Shipped"]),
      },
      {
        id: "Delivered",
        label: t("orders.statusDelivered", "Delivered"),
        count: countBy(["Delivered"]),
      },
    ];
  }, [orders, t]);

  function selectStatusTab(statusId: string) {
    setSelectedFilters((current) => {
      const withoutStatus = current.filter((f) => f.filterId !== "status");
      if (statusId === "All") return withoutStatus;
      return [
        ...withoutStatus,
        {
          id: `quick-status-${statusId}`,
          filterId: "status",
          operator: "is",
          value: statusId,
        },
      ];
    });
    setPage(1);
  }
  const isReviewFilterOn = selectedFilters.some(
    (filter) =>
      filter.filterId === "status" &&
      filter.operator === "is" &&
      filter.value === "Waiting for restaurant confirmation",
  );

  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = [
      order.orderNumber,
      order.orderNum,
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
        title={t("orders.title")}
        icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        additionalContent={
          <div className="space-y-3">
            {awaitingReviewCount > 0 || isReviewFilterOn ? (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-2xs"
              >
                <span>
                  <span className="font-bold tabular-nums">
                    {awaitingReviewCount}
                  </span>{" "}
                  {t("orders.offersNeedReview", "offers need your review before the supplier can prepare them.")}
                </span>
                {isReviewFilterOn ? (
                  <button
                    type="button"
                    onClick={clearReviewOrdersFilter}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("orders.showAllOrders", "Show all orders")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={showReviewOrders}
                    className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-amber-700"
                  >
                    {t("orders.reviewOffers", "Review offers")}
                  </button>
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {quickStatusTabs.map((tab) => {
                const isActive = activeStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectStatusTab(tab.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "border-primary bg-primary text-primary-content shadow-2xs"
                        : tab.highlight && tab.count > 0
                          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                        isActive
                          ? "bg-white/20 text-primary-content"
                          : tab.highlight && tab.count > 0
                            ? "bg-amber-200 text-amber-950"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("orders.searchOrdersPlaceholder", "Search by order, supplier, or status")}
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
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        totalCount={filteredOrders.length}
        emptyMessage={isLoadingOrders ? t("orders.loadingOrders", "Loading orders…") : t("orders.noOrdersMatch", "No orders match your search.")}
      />
    </DashboardTableContent>
  );
}
