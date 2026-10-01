import { ClipboardList, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { type CustomerOrderStatus } from "~/entities/horeca";
import { getLoggedInUser, getOrdersForSupplier } from "~/shared/lib/indexed-db";
import {
  DashboardTableContent,
  TableLayout,
  type TableColumn,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";

type SupplierOrderRow = {
  id: string;
  date: string;
  status: CustomerOrderStatus;
  itemCount: number;
  total: number;
  customerId: string;
  customerName: string;
};

const orderStatusClasses: Record<CustomerOrderStatus, string> = {
  New: "bg-amber-50 text-amber-700",
  Rejected: "bg-rose-50 text-rose-700",
  "Waiting for restaurant confirmation": "bg-sky-50 text-sky-700",
  Confirmed: "bg-violet-50 text-violet-700",
  Preparing: "bg-indigo-50 text-indigo-700",
  Shipped: "bg-cyan-50 text-cyan-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const pageSize = 5;

const supplierOrderStatusFilters = Object.keys(orderStatusClasses).map(
  (status) => ({ value: status, label: status }),
);

const orderOverviewValues = [
  "new",
  "in-progress",
  "closed",
] as const;

type OrderOverview = (typeof orderOverviewValues)[number];

const orderOverviewFilters: Array<{ value: OrderOverview; label: string }> = [
  { value: "new", label: "New orders" },
  { value: "in-progress", label: "Orders in progress" },
  { value: "closed", label: "Closed orders" },
];

const statusesByOverview: Record<OrderOverview, CustomerOrderStatus[]> = {
  new: ["New", "Rejected"],
  "in-progress": [
    "Waiting for restaurant confirmation",
    "Confirmed",
    "Preparing",
    "Shipped",
  ],
  closed: ["Delivered", "Cancelled"],
};

function isOrderOverview(value: string | null): value is OrderOverview {
  return orderOverviewValues.some((filter) => filter === value);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("hy-AM", {
    style: "currency",
    currency: "AMD",
    maximumFractionDigits: 0,
  }).format(amount);
}

const columns: TableColumn<SupplierOrderRow>[] = [
  {
    id: "order",
    header: "Order",
    cell: (order) => (
      <div>
        <span className="font-semibold text-slate-900">{order.id}</span>
        <p className="mt-0.5 text-xs text-slate-500">
          {new Date(order.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    ),
  },
  { id: "customer", header: "Customer", cell: (order) => order.customerName },
  { id: "items", header: "Items", cell: (order) => order.itemCount },
  {
    id: "status",
    header: "Status",
    cell: (order) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClasses[order.status]}`}
      >
        {order.status}
      </span>
    ),
  },
  {
    id: "total",
    header: "Total",
    cell: (order) => formatCurrency(order.total),
  },
];

export default function SupplierOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const customerId = searchParams.get("customerId");
  const overviewFromUrl = searchParams.get("overview");
  const selectedOverview = isOrderOverview(overviewFromUrl)
    ? overviewFromUrl
    : null;
  const [allOrders, setAllOrders] = useState<SupplierOrderRow[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "supplier") return;
      const orders = await getOrdersForSupplier(user.id);
      if (!isCurrent) return;
      setAllOrders(orders.map((order) => ({
        id: order.id,
        date: order.placedAt,
        status: order.status,
        itemCount: order.lines.reduce((count, line) => count + line.offeredQuantity, 0),
        total: order.lines.reduce((sum, line) => sum + line.offeredPrice * line.offeredQuantity, 0),
        customerId: order.horecaAccountId,
        customerName: order.horecaName,
      })));
    })().finally(() => {
      if (isCurrent) setIsLoadingOrders(false);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    setSelectedFilters((current) => [
      ...current.filter((filter) => filter.filterId !== "overview"),
      ...(selectedOverview
        ? [
            {
              id: "dashboard-order-overview",
              filterId: "overview",
              operator: "is" as const,
              value: selectedOverview,
            },
          ]
        : []),
    ]);
    setPage(1);
  }, [selectedOverview]);

  const customerFilteredOrders = customerId
    ? allOrders.filter((order) => order.customerId === customerId)
    : allOrders;
  const customerName = customerFilteredOrders[0]?.customerName;
  const supplierOrderSearchFilters: SearchFilterDefinition[] = [
    {
      id: "status",
      label: "Status",
      options: supplierOrderStatusFilters,
    },
    {
      id: "overview",
      label: "Order group",
      options: orderOverviewFilters,
    },
    {
      id: "customer",
      label: "Customer",
      options: Array.from(
        new Set(customerFilteredOrders.map((order) => order.customerName)),
      ).map((customer) => ({ value: customer, label: customer })),
    },
  ];

  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredOrders = customerFilteredOrders.filter((order) => {
    const matchesSearch = [order.id, order.customerName, order.status]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchValue);
    const matchesFilters = selectedFilters.every((filter) => {
      if (filter.filterId === "overview") {
        const matchesOverview = statusesByOverview[filter.value as OrderOverview]
          ?.includes(order.status) ?? false;

        return filter.operator === "is" ? matchesOverview : !matchesOverview;
      }

      const orderValue =
        filter.filterId === "status" ? order.status : order.customerName;
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
    const overviewFilter = filters.find(
      (filter) => filter.filterId === "overview" && filter.operator === "is",
    );
    setSearchParams((params) => {
      if (overviewFilter && isOrderOverview(overviewFilter.value)) {
        params.set("overview", overviewFilter.value);
      } else {
        params.delete("overview");
      }

      return params;
    });
    setPage(1);
  }

  function clearCustomerFilter() {
    setSearchParams((params) => {
      params.delete("customerId");
      return params;
    });
    setPage(1);
  }

  return (
    <DashboardTableContent>
      <TableLayout
        title="Orders"
        icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        additionalContent={
          customerId ? (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700"
            >
              <span>
                Filtered by customer:{" "}
                <span className="font-semibold text-slate-900">
                  {customerName ?? customerId}
                </span>
              </span>
              <button
                type="button"
                onClick={clearCustomerFilter}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/60"
                aria-label="Clear customer filter"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null
        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search orders"
        searchFilters={supplierOrderSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        columns={columns}
        rows={visibleOrders}
        getRowKey={(order) => order.id}
        rowLink={(order) => `/supplier/orders/${order.id}`}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalCount={filteredOrders.length}
        emptyMessage={isLoadingOrders ? "Loading orders…" : "No orders match your search."}
      />
    </DashboardTableContent>
  );
}
