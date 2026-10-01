import { BadgePercent, Gift, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  DashboardTableContent,
  TableLayout,
  type TableColumn,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";
import Modal from "~/shared/ui/modal";
import {
  getLoggedInUser,
  getSupplierPromotions,
  type StoredSupplierPromotion,
} from "~/shared/lib/indexed-db";

type PromotionType = "FixedPrice" | "Percentage" | "BuyXGetY";
type PromotionStatus = "Draft" | "Scheduled" | "Active" | "Expired" | "Disabled";

type PromotionProduct = {
  productId: number;
  fixedPrice: number | null;
  discountPercent: number | null;
};

type Promotion = {
  id: string;
  name: string | null;
  description: string | null;
  type: PromotionType;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  products: PromotionProduct[] | null;
};

const mockPromotions: Promotion[] = [
  {
    id: "PROMO-1001",
    name: "Spring pantry savings",
    description: "Save on staple pantry items for seasonal menu refreshes.",
    type: "Percentage",
    startDate: "2026-03-20T00:00:00Z",
    endDate: "2026-04-30T23:59:59Z",
    status: "Active",
    products: [
      { productId: 1001, fixedPrice: null, discountPercent: 15 },
      { productId: 1002, fixedPrice: null, discountPercent: 15 },
      { productId: 1003, fixedPrice: null, discountPercent: 15 },
    ],
  },
  {
    id: "PROMO-1002",
    name: "Chef's cheese selection",
    description: "A fixed price on selected artisan cheeses.",
    type: "FixedPrice",
    startDate: "2026-04-01T00:00:00Z",
    endDate: "2026-05-15T23:59:59Z",
    status: "Scheduled",
    products: [
      { productId: 1004, fixedPrice: 24.5, discountPercent: null },
      { productId: 1005, fixedPrice: 19.75, discountPercent: null },
    ],
  },
  {
    id: "PROMO-1003",
    name: "Buy 6, get 1 free",
    description: "Stock up on citrus boxes and receive one additional box.",
    type: "BuyXGetY",
    startDate: "2026-02-01T00:00:00Z",
    endDate: "2026-02-28T23:59:59Z",
    status: "Expired",
    products: [{ productId: 1006, fixedPrice: null, discountPercent: null }],
  },
  {
    id: "PROMO-1004",
    name: "Summer launch offer",
    description: "Early draft for the summer produce range.",
    type: "Percentage",
    startDate: "2026-06-01T00:00:00Z",
    endDate: "2026-06-30T23:59:59Z",
    status: "Draft",
    products: null,
  },
  {
    id: "PROMO-1005",
    name: "Olive oil volume price",
    description: "A fixed-price offer for qualifying olive oil orders.",
    type: "FixedPrice",
    startDate: "2026-01-10T00:00:00Z",
    endDate: "2026-03-10T23:59:59Z",
    status: "Disabled",
    products: [{ productId: 1007, fixedPrice: 20, discountPercent: null }],
  },
];

function promotionFromStored(promotion: StoredSupplierPromotion): Promotion {
  return {
    id: promotion.id,
    name: promotion.name,
    description: promotion.description,
    type: promotion.type,
    startDate: promotion.startDate,
    endDate: promotion.endDate ?? "—",
    // This column reflects the supplier's saved switch. Dates determine
    // buyer eligibility separately, so an active promotion never looks like
    // an unsaved draft just because its validity window needs attention.
    status: promotion.status === "Active" ? "Active" : "Draft",
    products: promotion.productIds.map((productId, index) => ({
      productId: Number(productId.replace(/\D/g, "")) || index + 1,
      fixedPrice: promotion.type === "FixedPrice"
        ? Number(Object.values(promotion.fixedPrices)[0]) || null
        : null,
      discountPercent: promotion.type === "Percentage"
        ? Number(promotion.discountPercent) || null
        : null,
    })),
  };
}

const pageSize = 5;

const promotionTypeLabels: Record<PromotionType, string> = {
  FixedPrice: "Fixed price",
  Percentage: "Percentage discount",
  BuyXGetY: "Buy X, get Y",
};

const statusClasses: Record<PromotionStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Scheduled: "bg-sky-50 text-sky-700",
  Active: "bg-emerald-50 text-emerald-700",
  Expired: "bg-amber-50 text-amber-700",
  Disabled: "bg-red-50 text-red-700",
};

const promotionSearchFilters: SearchFilterDefinition[] = [
  {
    id: "status",
    label: "Status",
    options: Object.keys(statusClasses).map((status) => ({
      value: status,
      label: status,
    })),
  },
  {
    id: "type",
    label: "Promotion type",
    options: Object.entries(promotionTypeLabels).map(([type, label]) => ({
      value: type,
      label,
    })),
  },
];

function formatDate(date: string) {
  if (!date || date === "—") return "No end date";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const columns: TableColumn<Promotion>[] = [
  {
    id: "name",
    header: "Promotion name",
    cell: (promotion) => (
      <div className="min-w-48">
        <p className="font-semibold text-slate-900">
          {promotion.name ?? "Untitled promotion"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{promotion.id}</p>
      </div>
    ),
  },
  {
    id: "type",
    header: "Promotion type",
    cell: (promotion) => promotionTypeLabels[promotion.type],
  },
  {
    id: "description",
    header: "Promotion description",
    className: "min-w-72 max-w-96",
    cell: (promotion) => (
      <p className="line-clamp-2 text-slate-600">{promotion.description ?? "—"}</p>
    ),
  },
  {
    id: "products",
    header: "Products included",
    cell: (promotion) => {
      const count = promotion.products?.length ?? 0;
      return `${count} ${count === 1 ? "product" : "products"}`;
    },
  },
  {
    id: "start-date",
    header: "Start date",
    cell: (promotion) => formatDate(promotion.startDate),
  },
  {
    id: "end-date",
    header: "End date",
    cell: (promotion) => formatDate(promotion.endDate),
  },
  {
    id: "status",
    header: "Status",
    cell: (promotion) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[promotion.status]}`}
      >
        {promotion.status}
      </span>
    ),
  },
];

export default function SupplierPromotionsPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [selectedPromotionType, setSelectedPromotionType] =
    useState<"discount" | "buy-x-get-y" | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "supplier") return;
      const savedPromotions = await getSupplierPromotions(user.id);
      if (!isCurrent) return;

      const saved = savedPromotions.map(promotionFromStored);
      setPromotions(saved);
    })();

    return () => {
      isCurrent = false;
    };
  }, []);
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredPromotions = promotions.filter((promotion) => {
    const matchesSearch = [
      promotion.id,
      promotion.name ?? "",
      promotion.description ?? "",
      promotionTypeLabels[promotion.type],
      promotion.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchValue);
    const matchesFilters = selectedFilters.every((filter) => {
      const promotionValue =
        filter.filterId === "status" ? promotion.status : promotion.type;
      const doesMatch = promotionValue === filter.value;

      return filter.operator === "is" ? doesMatch : !doesMatch;
    });

    return matchesSearch && matchesFilters;
  });
  const visiblePromotions = filteredPromotions.slice(
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

  function startPromotion() {
    if (!selectedPromotionType) return;

    setIsTypeModalOpen(false);
    navigate(`/supplier/promotions/new?type=${selectedPromotionType}`);
  }

  return (
    <DashboardTableContent>
      <TableLayout
        title="Promotions"
        icon={<BadgePercent className="h-5 w-5" aria-hidden="true" />}
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setSelectedPromotionType(null);
              setIsTypeModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add promotion
          </button>

        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search promotions"
        searchFilters={promotionSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        columns={columns}
        rows={visiblePromotions}
        getRowKey={(promotion) => promotion.id}
        rowLink={(promotion) => `/supplier/promotions/${promotion.id}`}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalCount={filteredPromotions.length}
        emptyMessage="No promotions match your search."
      />

      <Modal
        isOpen={isTypeModalOpen}
        title="Choose a promotion type"
        description="Choose how this offer changes the price of selected products."
        onClose={() => setIsTypeModalOpen(false)}
        size="sm"
      >
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setSelectedPromotionType("discount")}
            className={`w-full rounded-2xl border p-5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
              selectedPromotionType === "discount"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
            }`}
            aria-pressed={selectedPromotionType === "discount"}
          >
            <span className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BadgePercent className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">
                  Product discount
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Set either a fixed promotional price or a percentage discount.
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPromotionType("buy-x-get-y")}
            className={`w-full rounded-2xl border p-5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
              selectedPromotionType === "buy-x-get-y"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
            }`}
            aria-pressed={selectedPromotionType === "buy-x-get-y"}
          >
            <span className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Gift className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">
                  Buy X, get Y
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Reward customers with a product after they buy a qualifying quantity.
                </span>
              </span>
            </span>
          </button>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsTypeModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startPromotion}
              disabled={!selectedPromotionType}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    </DashboardTableContent>
  );
}
