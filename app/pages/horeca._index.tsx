import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Clock3,
  MapPin,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import {
  formatMarketplacePrice,
  getMarketplaceOptionLabel,
  getMarketplaceSellingOptions,
  marketplaceProducts,
  type MarketplaceCartLine,
  type MarketplaceProduct,
  type MarketplaceSellingOption,
} from "~/entities/product";
import {
  isPromotionVisibleOnHome,
  PromotionCard,
  type MarketplacePromotion,
} from "~/entities/promotion";
import { getMarketplaceSuppliers } from "~/shared/api";
import { getLoggedInUser, getOrdersForHoreca, type StoredOrder } from "~/shared/lib/indexed-db";
import { DashboardPageContent } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

type RecommendedSupplier = {
  id?: string;
  name: string;
  initials: string;
  description: string;
  deliveryNote: string;
  deliveryWindow: string;
  serviceArea: string;
  categories: string[];
  accentClassName: string;
  logoClassName: string;
};

function SupplierCard({ supplier }: { supplier: RecommendedSupplier }) {
  const { t } = useTranslation();
  return (
    <Link
      to={supplier.id ? `/horeca/suppliers/${supplier.id}` : "/horeca/suppliers"}
      className="group relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xs font-extrabold tracking-tight shadow-2xs ${supplier.logoClassName}`}
        >
          {supplier.initials}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("suppliers.verified")}
        </div>
      </div>

      <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-950 group-hover:text-primary">
        {supplier.name}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">
        {supplier.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {supplier.categories.map((category) => (
          <span
            key={category}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
          >
            {category}
          </span>
        ))}
      </div>

      <div className="mt-auto border-t border-slate-100 pt-3.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-500">
            <MapPin
              className="h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">{supplier.serviceArea}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium text-slate-700">
            <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {supplier.deliveryWindow}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PopularProductCard({
  product,
  inCartQty,
  onQuickAdd,
}: {
  product: (typeof marketplaceProducts)[number];
  inCartQty: number;
  onQuickAdd?: () => void;
}) {
  const firstOption = getMarketplaceSellingOptions(product)[0];
  return (
    <div className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs transition duration-200 hover:border-primary/30 hover:shadow-sm">
      <Link
        to={`/horeca/products/${product.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {product.image ? (
          <img
            src={product.image}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200/80"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Package className="h-6 w-6 text-slate-300" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900 group-hover:text-primary">
            {product.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {product.supplier}
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-sm font-extrabold tracking-tight text-slate-950 tabular-nums">
              {formatMarketplacePrice(product.price)}
            </span>
            {firstOption ? (
              <span className="truncate text-[11px] text-slate-500">
                / {getMarketplaceOptionLabel(firstOption)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      {onQuickAdd ? (
        <button
          type="button"
          onClick={onQuickAdd}
          className={`inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-bold transition ${
            inCartQty > 0
              ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-content"
              : "bg-primary text-primary-content shadow-2xs hover:brightness-95"
          }`}
          title="Quick add to cart"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {inCartQty > 0 ? <span className="tabular-nums">{inCartQty}</span> : null}
        </button>
      ) : null}
    </div>
  );
}

export default function HorecaDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { promotions, catalogProducts, cartLines, setCartLineQuantity } = useOutletContext<{
    promotions: MarketplacePromotion[];
    catalogProducts?: MarketplaceProduct[];
    cartLines?: MarketplaceCartLine[];
    setCartLineQuantity?: (
      product: MarketplaceProduct,
      option: MarketplaceSellingOption,
      quantity: number,
    ) => void;
  }>();
  const [suppliers, setSuppliers] = useState<RecommendedSupplier[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    let isActive = true;
    getMarketplaceSuppliers()
      .then((backendSuppliers) => {
        if (!isActive || !backendSuppliers.length) return;
        const accents = ["bg-emerald-500", "bg-amber-500", "bg-sky-500"];
        const logos = ["bg-emerald-600 text-white", "bg-amber-600 text-white", "bg-sky-600 text-white"];
        const mapped = backendSuppliers.map((s, idx) => ({
          id: s.id,
          name: s.companyName || "Supplier",
          initials: (s.companyName || "S").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
          description: s.description || "Trusted supplier on Synko platform.",
          deliveryNote: "Next delivery slot available tomorrow",
          deliveryWindow: "08:00–14:00",
          serviceArea: s.address || "Yerevan citywide",
          categories: Array.isArray(s.productCategories) && s.productCategories.length > 0 ? s.productCategories.slice(0, 3) : ["Produce", "General"],
          accentClassName: accents[idx % accents.length],
          logoClassName: logos[idx % logos.length],
        }));
        setSuppliers(mapped.slice(0, 6));
      })
      .catch(() => {});

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || !isActive) return;
      const list = await getOrdersForHoreca(user.id);
      if (isActive) setOrders(list);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const popularProducts = (catalogProducts || []).slice(0, 6);
  const homePromotions = promotions.filter(isPromotionVisibleOnHome);
  const awaitingConfirmCount = orders.filter(
    (o) => o.status === "Waiting for restaurant confirmation",
  ).length;
  const activeOrdersCount = orders.filter(
    (o) =>
      o.status === "New" ||
      o.status === "Confirmed" ||
      o.status === "Preparing" ||
      o.status === "Shipped" ||
      o.status === "Waiting for restaurant confirmation",
  ).length;

  return (
    <DashboardPageContent className="max-w-7xl space-y-6">
      {/* Hero + Quick Search & Action Bar */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {t("dashboard.sourcingBoard")}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {t("dashboard.kitchenStarts")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("dashboard.kitchenSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/horeca/products"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-content shadow-xs transition hover:brightness-95"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>{t("dashboard.browseProducts", "Order Products")}</span>
            </Link>
            <Link
              to="/horeca/orders"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <ClipboardList className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>{t("nav.orders", "My Orders")}</span>
            </Link>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-6 sm:grid-cols-4">
          <Link
            to="/horeca/orders"
            className="group flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition hover:border-primary/30 hover:bg-white"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-950 tabular-nums">
                {activeOrdersCount}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {t("orders.inProgressOrdersGroup", "Active orders")}
              </p>
            </div>
          </Link>

          <Link
            to="/horeca/orders"
            className={`group flex items-center gap-3.5 rounded-xl border p-3.5 transition ${
              awaitingConfirmCount > 0
                ? "border-amber-300 bg-amber-50/80 hover:bg-amber-50"
                : "border-slate-200/80 bg-slate-50/60 hover:border-primary/30 hover:bg-white"
            }`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                awaitingConfirmCount > 0
                  ? "bg-amber-500 text-white"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-950 tabular-nums">
                {awaitingConfirmCount}
              </p>
              <p className="truncate text-xs font-medium text-slate-600">
                {t("orders.reviewOffers", "Offers to review")}
              </p>
            </div>
          </Link>

          <Link
            to="/horeca/suppliers"
            className="group flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition hover:border-primary/30 hover:bg-white"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-950 tabular-nums">
                {suppliers.length}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {t("nav.suppliers", "Suppliers")}
              </p>
            </div>
          </Link>

          <Link
            to="/horeca/promotions"
            className="group flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition hover:border-primary/30 hover:bg-white"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-950 tabular-nums">
                {homePromotions.length}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {t("nav.promotions", "Promotions")}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Popular Products with 1-Click Add to Cart */}
      {popularProducts.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {t("dashboard.mostOrderedThisWeek")}
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                {t("dashboard.popularProducts")}
              </h2>
            </div>
            <Link
              to="/horeca/products"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-80"
            >
              {t("dashboard.browseProducts")}{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularProducts.map((product) => {
              const firstOption = getMarketplaceSellingOptions(product)[0];
              const inCartQty =
                (cartLines ?? [])
                  .filter((l) => l.product.id === product.id)
                  .reduce((sum, l) => sum + l.quantity, 0);
              return (
                <PopularProductCard
                  key={product.id}
                  product={product}
                  inCartQty={inCartQty}
                  onQuickAdd={
                    setCartLineQuantity && firstOption
                      ? () =>
                          setCartLineQuantity(
                            product,
                            firstOption,
                            inCartQty === 0
                              ? firstOption.minimumOrderQuantity
                              : inCartQty + 1,
                          )
                      : undefined
                  }
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Active Supplier Promotions */}
      {homePromotions.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dashboard.supplierPromotions")}
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                {t("dashboard.offersFromSuppliers")}
              </h2>
            </div>
            <Link
              to="/horeca/promotions"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-80"
            >
              {t("dashboard.viewAllOffers")}{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {homePromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Recommended Suppliers */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("dashboard.handpickedForKitchen")}
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {t("dashboard.recommendedSuppliers")}
            </h2>
          </div>
          <Link
            to="/horeca/suppliers"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-primary hover:bg-primary hover:text-primary-content"
          >
            {t("dashboard.viewAllSuppliers")}{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.name} supplier={supplier} />
          ))}
        </div>
      </section>
    </DashboardPageContent>
  );
}
