import { ArrowRight, Layers3, MapPin, Search, Store, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
// Removed mock IndexedDB imports
import { getMarketplaceSuppliers } from "~/shared/api";
import { DashboardPageContent, Pagination } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

type DirectorySupplier = {
  id: string;
  name: string;
  initials: string;
  categories: string[];
  serviceArea: string;
  description: string;
};

function getSupplierInitials(companyName: string) {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "S";
}

function SupplierCard({ supplier }: { supplier: DirectorySupplier }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/horeca/suppliers/${supplier.id}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-start gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#dff0e3] text-sm font-extrabold tracking-tight text-[#25633e]"
          role="img"
          aria-label={`${supplier.name} logo`}
        >
          {supplier.initials}
        </div>
        <div className="min-w-0 pt-1">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            {supplier.name}
          </h2>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{supplier.serviceArea}</span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-600">
        {supplier.description}
      </p>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          <Layers3 className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("auth.categories")}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {supplier.categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
            >
              {category}
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2">
          {t("suppliers.viewCatalog")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default function HorecaSuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<DirectorySupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      try {
        const backendSuppliers = await getMarketplaceSuppliers();
        if (isCurrent) {
          const mapped = backendSuppliers.map((s) => ({
            id: s.id,
            name: s.companyName,
            initials: getSupplierInitials(s.companyName),
            categories:
              Array.isArray(s.productCategories) && s.productCategories.length > 0
                ? s.productCategories
                : ["Produce", "General"],
            serviceArea: s.serviceArea || s.address || "Available through Synko",
            description:
              s.description ||
              `${s.companyName} is available to receive orders through Synko.`,
          }));
          setSuppliers(mapped);
          setLoadError(null);
        }
      } catch {
        if (isCurrent) {
          setLoadError("We couldn't load the supplier directory. Please try again.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, []);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers) {
      for (const cat of s.categories) {
        if (cat) set.add(cat);
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesCategory =
        selectedCategory === "All" ||
        supplier.categories.some(
          (c) => c.toLowerCase() === selectedCategory.toLowerCase(),
        );

      if (!matchesCategory) return false;
      if (!q) return true;

      const searchableText = [
        supplier.name,
        supplier.serviceArea,
        supplier.description,
        ...supplier.categories,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [suppliers, searchQuery, selectedCategory]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  const pagedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  return (
    <DashboardPageContent>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Store className="h-4 w-4" aria-hidden="true" />
              {t("nav.suppliers")}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              {t("suppliers.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {t("suppliers.subtitle")}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-slate-500">
            {isLoading ? (
              t("common.loading")
            ) : searchQuery.trim() || selectedCategory !== "All" ? (
              <>
                Showing <span className="font-bold text-slate-950 tabular-nums">{filteredSuppliers.length}</span> of{" "}
                <span className="font-bold text-slate-950 tabular-nums">{suppliers.length}</span> suppliers
              </>
            ) : (
              <>
                <span className="font-bold text-slate-950 tabular-nums">{suppliers.length}</span> suppliers
              </>
            )}
          </p>
        </header>

        {/* Search & Filter Toolbar */}
        {!isLoading && suppliers.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="h-4 w-4" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("suppliers.searchPlaceholder")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label={t("nav.suppliers")}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search query"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Quick category filter tags */}
            {allCategories.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="mr-1 text-xs font-semibold text-slate-500">{t("common.filter")}:</span>
                {allCategories.map((category) => {
                  const isSelected = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        isSelected
                          ? "bg-primary text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loadError ? (
          <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        ) : isLoading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading suppliers">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredSuppliers.length > 0 ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedSuppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>
            <div className="mt-6">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalCount={filteredSuppliers.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 25, 50, 100]}
                itemName="suppliers"
              />
            </div>
          </>
        ) : suppliers.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-900">
              No suppliers found matching "{searchQuery}"
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try searching with different keywords or clearing your active filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reset search & filters
            </button>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No suppliers are available yet.
          </p>
        )}
      </section>
    </DashboardPageContent>
  );
}
