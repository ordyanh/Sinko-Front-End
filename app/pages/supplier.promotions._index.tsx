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
import { useTranslation } from "~/shared/lib/i18n";

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

const mockPromotions: Promotion[] = [];

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

const statusClasses: Record<PromotionStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Scheduled: "bg-sky-50 text-sky-700",
  Active: "bg-emerald-50 text-emerald-700",
  Expired: "bg-amber-50 text-amber-700",
  Disabled: "bg-red-50 text-red-700",
};

function formatDate(date: string, t: (k: string) => string) {
  if (!date || date === "—") return t("promotions.noEndDate");
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return t("promotions.noEndDate");

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function SupplierPromotionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function getPromotionTypeLabel(type: PromotionType): string {
    switch (type) {
      case "FixedPrice":
        return t("promotions.fixedPrice");
      case "Percentage":
        return t("promotions.percentageDiscount");
      case "BuyXGetY":
        return t("promotions.buyXGetY");
      default:
        return type;
    }
  }

  function getPromotionStatusLabel(status: PromotionStatus): string {
    switch (status) {
      case "Draft":
        return t("promotions.statusDraft");
      case "Active":
        return t("promotions.statusLive");
      case "Scheduled":
        return t("promotions.statusScheduled");
      case "Expired":
        return t("promotions.statusExpired");
      case "Disabled":
        return t("promotions.statusDisabled");
      default:
        return status;
    }
  }

  const promotionSearchFilters: SearchFilterDefinition[] = [
    {
      id: "status",
      label: t("common.status"),
      options: (Object.keys(statusClasses) as PromotionStatus[]).map((status) => ({
        value: status,
        label: getPromotionStatusLabel(status),
      })),
    },
    {
      id: "type",
      label: t("promotions.promotionType"),
      options: [
        { value: "FixedPrice", label: t("promotions.fixedPrice") },
        { value: "Percentage", label: t("promotions.percentageDiscount") },
        { value: "BuyXGetY", label: t("promotions.buyXGetY") },
      ],
    },
  ];

  const columns: TableColumn<Promotion>[] = [
    {
      id: "name",
      header: t("common.name"),
      cell: (promotion) => (
        <div className="min-w-48">
          <p className="font-semibold text-slate-900">
            {promotion.name ?? t("promotions.untitledPromotion")}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{promotion.id}</p>
        </div>
      ),
    },
    {
      id: "type",
      header: t("promotions.promotionType"),
      cell: (promotion) => getPromotionTypeLabel(promotion.type),
    },
    {
      id: "description",
      header: t("products.description"),
      className: "min-w-72 max-w-96",
      cell: (promotion) => (
        <p className="line-clamp-2 text-slate-600">{promotion.description ?? "—"}</p>
      ),
    },
    {
      id: "products",
      header: t("nav.products"),
      cell: (promotion) => {
        const count = promotion.products?.length ?? 0;
        return `${count} ${count === 1 ? t("common.product") : t("nav.products")}`;
      },
    },
    {
      id: "start-date",
      header: t("promotions.startDate"),
      cell: (promotion) => formatDate(promotion.startDate, t),
    },
    {
      id: "end-date",
      header: t("promotions.validUntil"),
      cell: (promotion) => formatDate(promotion.endDate, t),
    },
    {
      id: "status",
      header: t("common.status"),
      cell: (promotion) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[promotion.status]}`}
        >
          {getPromotionStatusLabel(promotion.status)}
        </span>
      ),
    },
  ];
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
      // Deduplicate by ID and normalized name
      const uniquePromos: Promotion[] = [];
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();

      for (const p of saved) {
        const normName = p.name?.trim().toLowerCase() || "";
        if (seenIds.has(p.id)) continue;
        if (normName && seenNames.has(normName)) continue;

        seenIds.add(p.id);
        if (normName) seenNames.add(normName);
        uniquePromos.push(p);
      }

      setPromotions(uniquePromos);
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
      getPromotionTypeLabel(promotion.type),
      getPromotionStatusLabel(promotion.status),
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
        title={t("promotions.title")}
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
            {t("promotions.createPromotion")}
          </button>
        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("common.search")}
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
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        totalCount={filteredPromotions.length}
        emptyMessage={t("common.noResults")}
      />

      <Modal
        isOpen={isTypeModalOpen}
        title={t("promotions.chooseOfferType")}
        description={t("promotions.createPromotionDesc")}
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
                  {t("promotions.productDiscount")}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {t("promotions.productDiscountDesc")}
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
                  {t("promotions.buyXGetY")}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {t("promotions.buyXGetYDesc")}
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
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={startPromotion}
              disabled={!selectedPromotionType}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardTableContent>
  );
}
