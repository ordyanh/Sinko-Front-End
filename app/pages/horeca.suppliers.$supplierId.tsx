import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Clock3,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  formatAmd,
  formatOrderDate,
  horecaOrderStatusClasses,
  horecaOrderStatusLabels,
  type HorecaOrder,
} from "~/entities/horeca";
import {
  formatMarketplacePrice,
  getHorecaMarketplaceProducts,
  getMarketplaceOptionLabel,
  getMarketplaceProductPrice,
  getMarketplaceSellingOptions,
  mapBackendMarketplaceProduct,
  type MarketplaceProduct,
} from "~/entities/product";
import { type MarketplaceSupplier } from "~/entities/supplier";
import {
  getMarketplaceSupplierById as getBackendMarketplaceSupplierById,
  getMarketplaceSuppliers,
  getHorecaOrders as getBackendHorecaOrders,
} from "~/shared/api";
import { getVisibleSupplierPromotions, PromotionCard } from "~/entities/promotion";
import { DashboardPageContent, Pagination } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

function DetailLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary hover:bg-primary hover:text-primary-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export default function HorecaSupplierDetailsPage() {
  const { t } = useTranslation();
  const { supplierId = "" } = useParams();
  const [supplier, setSupplier] = useState<MarketplaceSupplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<MarketplaceProduct[]>([]);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPageSize, setProductsPageSize] = useState(10);
  const [supplierOrders, setSupplierOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pagedSupplierProducts = useMemo(() => {
    const start = (productsPage - 1) * productsPageSize;
    return (supplierProducts || []).slice(start, start + productsPageSize);
  }, [supplierProducts, productsPage, productsPageSize]);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    const targetId = String(supplierId || "").toLowerCase();

    Promise.all([
      getBackendMarketplaceSupplierById(supplierId).catch(() => null),
      getHorecaMarketplaceProducts().catch(() => []),
      getBackendHorecaOrders().catch(() => []),
      getMarketplaceSuppliers().catch(() => []),
    ])
      .then(([res, catalog, orders, suppliersList]) => {
        if (!isActive) return;

        // 1. Resolve supplier info from any available source
        const rawSupplier: any = res?.supplier || res;
        const fromDirectory = (suppliersList || []).find(
          (s: any) => s?.id != null && String(s.id).toLowerCase() === targetId
        );
        const fromCatalog = (catalog || []).find(
          (p: any) => p?.supplierId != null && String(p.supplierId).toLowerCase() === targetId
        );

        const supplierFound =
          rawSupplier?.companyName || rawSupplier?.id
            ? rawSupplier
            : fromDirectory
            ? fromDirectory
            : fromCatalog
            ? {
                id: supplierId,
                companyName: fromCatalog.supplier || "Supplier",
                description: `${fromCatalog.supplier || "Supplier"} is available to receive orders.`,
                serviceArea: "Yerevan",
              }
            : null;

        if (supplierFound) {
          const suppName =
            supplierFound.companyName || supplierFound.name || "Supplier";
          const words = String(suppName || "S").trim().split(/\s+/).filter(Boolean);
          const initials =
            words.length > 1 && words[0]?.[0] && words[1]?.[0]
              ? (words[0][0] + words[1][0]).toUpperCase()
              : String(suppName).slice(0, 2).toUpperCase() || "SP";

          const rawCats =
            Array.isArray(supplierFound.productCategories) &&
            supplierFound.productCategories.length > 0
              ? supplierFound.productCategories
              : Array.isArray(res?.categories) && res.categories.length > 0
              ? res.categories
              : ["Produce", "General"];

          const categories: string[] = rawCats
            .map((c: any) =>
              typeof c === "string"
                ? c
                : c?.name || c?.categoryName || (c?.id != null ? `Category ${c.id}` : "")
            )
            .filter((c: string): c is string => Boolean(c && typeof c === "string"));
          if (categories.length === 0) {
            categories.push("Produce", "General");
          }

          const serviceArea =
            supplierFound.serviceArea ||
            supplierFound.address ||
            "Yerevan";

          const suppPhone =
            supplierFound.phoneNumber ||
            supplierFound.phone ||
            fromDirectory?.phoneNumber ||
            fromDirectory?.phone ||
            "—";
          const suppEmail =
            supplierFound.email ||
            fromDirectory?.email ||
            "—";
          const suppContactName =
            (supplierFound.contactName && supplierFound.contactName !== suppName
              ? supplierFound.contactName
              : fromDirectory?.contactName && fromDirectory.contactName !== suppName
                ? fromDirectory.contactName
                : "") || "";

          const supp: MarketplaceSupplier = {
            id: String(supplierFound.id || supplierId),
            name: suppName,
            initials,
            logoClassName: "bg-[#dff0e3] text-[#25633e]",
            accentClassName: "bg-[#dceede]",
            categories,
            serviceArea,
            description:
              supplierFound.description ||
              `${suppName} is available to receive orders.`,
            contactName: suppContactName,
            phone: suppPhone,
            email: suppEmail,
            address: supplierFound.address || fromDirectory?.address || serviceArea,
            deliveryWindow: "08:00-14:00",
            deliveryNote: "Next delivery slot available tomorrow",
            orderSupplierId: String(supplierFound.id || supplierId),
          };
          setSupplier(supp);

          // 2. Resolve supplier products
          // Combine products directly returned with supplier details + catalog
          const directProducts = Array.isArray(res?.products)
            ? res.products.map(mapBackendMarketplaceProduct)
            : [];

          const suppIdLower = String(supp.id || "").toLowerCase();
          const suppNameLower = String(supp.name || "").toLowerCase();

          const catalogProds = (catalog || []).filter((p: any) => {
            if (!p) return false;
            const pSuppId = p.supplierId != null ? String(p.supplierId).toLowerCase() : "";
            const pSuppName = p.supplier != null ? String(p.supplier).toLowerCase() : "";
            return (
              (pSuppId && suppIdLower && pSuppId === suppIdLower) ||
              (pSuppName && suppNameLower && pSuppName === suppNameLower)
            );
          });

          const combinedProds = [...directProducts];
          for (const cp of catalogProds) {
            if (!combinedProds.some((p) => String(p.id) === String(cp.id))) {
              combinedProds.push(cp);
            }
          }

          setSupplierProducts(combinedProds);

          const filteredOrders = (orders || [])
            .filter((o: any) => {
              if (!o) return false;
              const oSuppId = o.supplierId != null ? String(o.supplierId).toLowerCase() : "";
              const oSuppName = o.supplierName != null ? String(o.supplierName).toLowerCase() : "";
              return (
                (oSuppId && suppIdLower && oSuppId === suppIdLower) ||
                (oSuppName && suppNameLower && oSuppName === suppNameLower)
              );
            })
            .slice(0, 3);
          setSupplierOrders(filteredOrders);
        } else {
          setSupplier(null);
        }
      })
      .catch((err) => {
        console.error("Error loading supplier details:", err);
        if (isActive) setSupplier(null);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [supplierId]);

  if (isLoading) {
    return (
      <DashboardPageContent>
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-medium text-slate-500">
          {t("suppliers.loadingSupplier")}
        </div>
      </DashboardPageContent>
    );
  }

  if (!supplier) {
    return (
      <DashboardPageContent>
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {t("common.noResults")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("suppliers.subtitle")}
          </p>
          <Link
            to="/horeca/suppliers"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("suppliers.backToSuppliers")}
          </Link>
        </section>
      </DashboardPageContent>
    );
  }

  const supplierPromotions = getVisibleSupplierPromotions(supplier.name);
  const productsHref = `/horeca/products?supplier=${encodeURIComponent(supplier.name)}`;
  const ordersHref = `/horeca/orders?supplier=${encodeURIComponent(supplier.name)}`;

  return (
    <DashboardPageContent>
      <div className="space-y-5">
        <Link
          to="/horeca/suppliers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("suppliers.backToSuppliers")}
        </Link>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className={`h-2 ${supplier.accentClassName}`} aria-hidden="true" />
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <div
                  className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-base font-extrabold tracking-tight ${supplier.logoClassName}`}
                  role="img"
                  aria-label={`${supplier.name} logo`}
                >
                  {supplier.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {t("nav.supplierProfile")}
                  </p>
                  <h1 className="mt-2 break-words text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                    {supplier.name}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    {supplier.description}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#dce7d7] bg-[#f5f8f2] px-4 py-3 text-sm sm:min-w-56">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t("common.delivery")} {supplier.deliveryWindow.replace(/â€“|–/g, "-")}
                </span>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  {supplier.deliveryNote}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              {supplier.categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("suppliers.deliveryArea")}
            </div>
            <p className="mt-3 text-lg font-bold tracking-tight text-slate-950">
              {supplier.serviceArea}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{supplier.address}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("suppliers.orderingContact")}
            </div>
            {supplier.contactName && supplier.contactName !== supplier.name ? (
              <p className="mt-3 text-lg font-bold tracking-tight text-slate-950">
                {supplier.contactName}
              </p>
            ) : null}
            <div className={`${supplier.contactName && supplier.contactName !== supplier.name ? "mt-3" : "mt-4"} space-y-2 text-sm text-slate-600`}>
              <a
                className="flex w-fit items-center gap-2 font-semibold text-slate-900 transition hover:text-primary"
                href={
                  supplier.phone && supplier.phone !== "—"
                    ? `tel:${String(supplier.phone).replace(/\s+/g, "")}`
                    : "#"
                }
              >
                <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span>{supplier.phone && supplier.phone !== "—" ? supplier.phone : "—"}</span>
              </a>
              <a
                className="flex w-fit items-center gap-2 text-slate-600 transition hover:text-primary"
                href={
                  supplier.email && supplier.email !== "—"
                    ? `mailto:${supplier.email}`
                    : "#"
                }
              >
                <AtSign className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span>{supplier.email && supplier.email !== "—" ? supplier.email : "—"}</span>
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Package className="h-4 w-4" aria-hidden="true" />
                {t("suppliers.currentCatalogue")}
              </div>
              <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-slate-950">
                {t("suppliers.productsFrom", { name: supplier.name })}
              </h2>
            </div>
            <DetailLink to={productsHref}>{t("suppliers.viewAllProducts")}</DetailLink>
          </div>

          {supplierProducts.length > 0 ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pagedSupplierProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/horeca/products/${product.id}`}
                    className="group flex min-w-0 gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {product.image ? (
                      <img src={product.image} onError={(e) => { e.currentTarget.style.display = "none"; }} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Package className="h-8 w-8 text-slate-300" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 py-0.5">
                      <p className="text-sm font-bold leading-5 tracking-tight text-slate-900">
                        {product.title}
                      </p>
                      <p
                        className="mt-1 truncate text-xs text-slate-500"
                        title={
                          (getMarketplaceSellingOptions(product) || [])
                            .map(getMarketplaceOptionLabel)
                            .filter(Boolean)
                            .join(", ")
                        }
                      >
                        {(getMarketplaceSellingOptions(product) || [])
                          .map(getMarketplaceOptionLabel)
                          .filter(Boolean)
                          .join(" · ") || product.unit || "unit"}
                      </p>
                      <p className="mt-3 text-sm font-bold text-slate-950 tabular-nums">
                        {formatMarketplacePrice(getMarketplaceProductPrice(product))}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <Pagination
                  page={productsPage}
                  pageSize={productsPageSize}
                  totalCount={supplierProducts.length}
                  onPageChange={setProductsPage}
                  onPageSizeChange={setProductsPageSize}
                  pageSizeOptions={[5, 10, 25, 50, 100]}
                  itemName={t("nav.products")}
                />
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-500">{t("suppliers.noProductsListed")}</p>
          )}
        </section>

        {supplierPromotions.length > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  {t("suppliers.supplierOffers")}
                </div>
                <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-slate-950">{t("suppliers.currentOffersFrom", { name: supplier.name })}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("suppliers.reviewSupplierPromotions")}</p>
              </div>
              <span className="text-sm font-semibold text-slate-500"><span className="font-bold text-slate-950">{supplierPromotions.length}</span> {t("suppliers.activeOffersCount", { count: supplierPromotions.length })}</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">{supplierPromotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}</div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                {t("suppliers.recentOrders")}
              </div>
              <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-slate-950">
                {t("suppliers.pastOrdersSupplier", { name: supplier.name })}
              </h2>
            </div>
            <DetailLink to={ordersHref}>{t("suppliers.viewAllOrders")}</DetailLink>
          </div>

          {supplierOrders.length > 0 ? (
            <div className="mt-2 divide-y divide-slate-100">
              {supplierOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/horeca/orders/${order.id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 py-4 transition hover:px-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950 tabular-nums">{order.id}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Placed {order.placedAt ? formatOrderDate(order.placedAt) : "Recently"} ·{" "}
                      {(order.lines || order.items || []).length} {t("orders.items")}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${horecaOrderStatusClasses[order.status as keyof typeof horecaOrderStatusClasses] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {horecaOrderStatusLabels[order.status as keyof typeof horecaOrderStatusLabels] ?? String(order.status)}
                    </span>
                    <span className="text-sm font-bold text-slate-950 tabular-nums">
                      {formatAmd(
                        ((order.lines || order.items || []) as any[]).reduce(
                          (total: number, line: any) =>
                            total +
                            (line.offeredPrice ?? line.price ?? line.unitPrice ?? 0) *
                              (line.offeredQuantity ?? line.quantity ?? line.count ?? 1),
                          0,
                        ),
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">{t("suppliers.noOrdersPlaced")}</p>
          )}
        </section>
      </div>
    </DashboardPageContent>
  );
}

export function ErrorBoundary({ error }: any) {
  return (
    <DashboardPageContent>
      <section className="rounded-3xl border border-red-200 bg-red-50/50 p-6 text-slate-900 sm:p-8">
        <h1 className="text-xl font-bold text-red-700">Unable to display supplier details</h1>
        <p className="mt-2 text-sm text-slate-600">
          An error occurred while loading this supplier. Please try returning to the suppliers directory.
        </p>
        {error instanceof Error ? (
          <p className="mt-3 rounded-xl bg-red-100/60 p-3 font-mono text-xs text-red-800">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6">
          <Link
            to="/horeca/suppliers"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to suppliers
          </Link>
        </div>
      </section>
    </DashboardPageContent>
  );
}