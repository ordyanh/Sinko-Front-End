import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMyClients } from "~/shared/api";
import {
  getHorecaUsers,
  getLoggedInUser,
  getOrdersForSupplier,
} from "~/shared/lib/indexed-db";
import {
  DashboardTableContent,
  TableLayout,
  type TableColumn,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";

const pageSize = 5;

type SupplierCustomer = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  activityType: string;
  address: string;
  totalOrders: number;
  status: "Active";
};

const columns: TableColumn<SupplierCustomer>[] = [
  {
    id: "customer",
    header: "Customer",
    cell: (customer) => (
      <div>
        <p className="font-semibold text-slate-900">{customer.companyName}</p>
        <p className="mt-0.5 text-xs text-slate-500">{customer.email}</p>
      </div>
    ),
  },
  {
    id: "activity-type",
    header: "Activity Type",
    cell: (customer) => customer.activityType,
  },
  {
    id: "location",
    header: "Location",
    cell: (customer) => customer.address,
  },
  {
    id: "orders",
    header: "Orders",
    cell: (customer) => customer.totalOrders,
  },
  {
    id: "status",
    header: "Status",
    cell: (customer) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          customer.status === "Active"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-200 text-slate-700"
        }`}
      >
        {customer.status}
      </span>
    ),
  },
];

export default function SupplierCustomersPage() {
  const [customers, setCustomers] = useState<SupplierCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const customerSearchFilters = useMemo<SearchFilterDefinition[]>(
    () => [
      {
        id: "status",
        label: "Status",
        options: [{ value: "Active", label: "Active" }],
      },
      {
        id: "activityType",
        label: "Activity type",
        options: Array.from(
          new Set(customers.map((customer) => customer.activityType)),
        ).map((activityType) => ({ value: activityType, label: activityType })),
      },
    ],
    [customers],
  );

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      // 1. Try real backend customers API first
      try {
        const backendClients = await getMyClients();
        if (Array.isArray(backendClients) && backendClients.length > 0) {
          if (!isCurrent) return;
          setCustomers(
            backendClients.map((client) => ({
              id: client.id || client.clientId || "client",
              companyName: client.companyName || "Client Company",
              contactName: client.contactPerson || client.companyName || "—",
              email: client.email || "—",
              activityType: "HORECA",
              address: client.address || "Yerevan",
              totalOrders: client.totalOrders ?? 0,
              status: "Active",
            })),
          );
          return;
        }
      } catch {
        // fallback to local data
      }

      // 2. Fallback to local storage
      const [horecaUsers, user] = await Promise.all([
        getHorecaUsers(),
        getLoggedInUser(),
      ]);
      const orders =
        user?.role === "supplier" ? await getOrdersForSupplier(user.id) : [];
      const orderCountByCustomerId = new Map<string, number>();

      for (const order of orders) {
        orderCountByCustomerId.set(
          order.horecaAccountId,
          (orderCountByCustomerId.get(order.horecaAccountId) ?? 0) + 1,
        );
      }

      if (!isCurrent) return;

      setCustomers(
        horecaUsers.map((user) => ({
          id: user.id,
          companyName: user.companyName,
          contactName: user.displayName,
          email: user.email,
          activityType: "HORECA",
          address: user.address,
          totalOrders: orderCountByCustomerId.get(user.id) ?? 0,
          status: "Active",
        })),
      );
    })()
      .catch(() => {
        if (isCurrent) {
          setLoadError("We couldn't load customers.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = [
      customer.id,
      customer.companyName,
      customer.contactName,
      customer.email,
      customer.activityType,
      customer.address,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchValue);

    const matchesFilters = selectedFilters.every((filter) => {
      const customerValue =
        filter.filterId === "status" ? customer.status : customer.activityType;
      const doesMatch = customerValue === filter.value;

      return filter.operator === "is" ? doesMatch : !doesMatch;
    });

    return matchesSearch && matchesFilters;
  });
  const visibleCustomers = filteredCustomers.slice(
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

  return (
    <DashboardTableContent>
      <TableLayout
        title="Customers"
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search customers"
        searchFilters={customerSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        columns={columns}
        rows={visibleCustomers}
        getRowKey={(customer) => customer.id}
        rowLink={(customer) => `/supplier/customers/${customer.id}`}
        isLoading={isLoading}
        errorMessage={loadError}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalCount={filteredCustomers.length}
        emptyMessage="No HORECA customers match your search."
      />
    </DashboardTableContent>
  );
}
