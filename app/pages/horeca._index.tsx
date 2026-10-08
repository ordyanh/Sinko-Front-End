import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  MapPin,
  Package,
  Sparkles,
  Tag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import {
  formatMarketplacePrice,
  getMarketplaceOptionLabel,
  getMarketplaceSellingOptions,
  marketplaceProducts,
  type MarketplaceProduct,
} from "~/entities/product";
import {
  isPromotionVisibleOnHome,
  PromotionCard,
  type MarketplacePromotion,
} from "~/entities/promotion";
import { getMarketplaceSuppliers } from "~/shared/api";
import { DashboardPageContent } from "~/shared/ui";

type RecommendedSupplier = {
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

const recommendedSuppliers: RecommendedSupplier[] = [];

function SupplierCard({ supplier }: { supplier: RecommendedSupplier }) {
  return (
    <article className="group relative flex min-h-72 flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_2px_3px_rgba(15,23,42,0.02)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.09)]">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 ${supplier.accentClassName}`}
      />
      <div className="flex items-start justify-between gap-4 pt-1">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xs font-extrabold tracking-tight shadow-sm ${supplier.logoClassName}`}
        >
          {supplier.initials}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#f1f6ef] px-2.5 py-1 text-[11px] font-bold text-[#406a45]">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Recommended
        </div>
      </div>

      <h2 className="mt-5 text-xl font-bold tracking-[-0.035em] text-slate-950">
        {supplier.name}
      </h2>
      <p className="mt-2 min-h-12 text-sm leading-5 text-slate-600">
        {supplier.description}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {supplier.categories.map((category) => (
          <span
            key={category}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
          >
            {category}
          </span>
        ))}
      </div>

      <div className="mt-auto border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-slate-500">
            <MapPin
              className="h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {supplier.serviceArea}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-slate-700">
            <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {supplier.deliveryWindow}
          </span>
        </div>
        <p className="mt-3 text-xs font-medium text-[#406a45]">
          {supplier.deliveryNote}
        </p>
      </div>
    </article>
  );
}

function PopularProductCard({
  product,
}: {
  product: (typeof marketplaceProducts)[number];
}) {
  return (
    <Link
      to="/horeca/products"
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {product.image ? (
        <img
          src={product.image}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Package className="h-7 w-7 text-slate-300" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold tracking-tight text-slate-900">
          {product.title}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {product.supplier}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold tracking-tight text-slate-950 tabular-nums">
            {formatMarketplacePrice(product.price)}
          </span>
          <span
            className="shrink-0 truncate text-[11px] text-slate-500"
            title={getMarketplaceSellingOptions(product)
              .map(getMarketplaceOptionLabel)
              .join(", ")}
          >
            {getMarketplaceSellingOptions(product)
              .map(getMarketplaceOptionLabel)
              .join(" · ")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HorecaDashboardPage() {
  const { promotions, catalogProducts } = useOutletContext<{
    promotions: MarketplacePromotion[];
    catalogProducts?: MarketplaceProduct[];
  }>();
  const [suppliers, setSuppliers] = useState<RecommendedSupplier[]>([]);

  useEffect(() => {
    let isActive = true;
    getMarketplaceSuppliers()
      .then((backendSuppliers) => {
        if (!isActive || !backendSuppliers.length) return;
        const accents = ["bg-[#dceede]", "bg-[#fff0c8]", "bg-[#e8e3f8]"];
        const logos = ["bg-[#236548] text-white", "bg-[#b7740d] text-white", "bg-[#655099] text-white"];
        const mapped = backendSuppliers.map((s, idx) => ({
          name: s.companyName || "Supplier",
          initials: (s.companyName || "S").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
          description: s.description || "Trusted supplier on Sinko platform.",
          deliveryNote: "Next delivery slot available tomorrow",
          deliveryWindow: "08:00–14:00",
          serviceArea: s.address || "Yerevan citywide",
          categories: ["Produce", "General"],
          accentClassName: accents[idx % accents.length],
          logoClassName: logos[idx % logos.length],
        }));
        setSuppliers(mapped.slice(0, 6));
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, []);

  const popularProducts = (catalogProducts || []).slice(0, 4);
  const homePromotions = promotions.filter(isPromotionVisibleOnHome);

  return (
    <DashboardPageContent className="max-w-[88rem]">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#fffefa] shadow-sm">
        <section className="relative overflow-hidden border-b border-[#e4e9df] bg-[#f5f8f2] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div
            className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-[#dbe8d5] opacity-80"
            aria-hidden="true"
          />
          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Today&apos;s sourcing board
              </div>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                The kitchen starts with good suppliers.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                A focused shortlist of dependable partners and ingredients for
                your next service.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#dce7d7] bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7f0e2] text-primary">
                <Package className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm leading-5 text-slate-600">
                <span className="block font-bold text-slate-950">
                  Fresh stock, ready to order
                </span>
                Browse suppliers and add what you need.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-[#e8ece6] bg-white px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Tag className="h-4 w-4" aria-hidden="true" />
                Supplier promotions
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl">
                Offers from your suppliers
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                The active promotions each supplier chose to feature.
              </p>
            </div>
            <Link
              to="/horeca/promotions"
              className="hidden items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/75 sm:inline-flex"
            >
              View all offers{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {homePromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>

        <section className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Handpicked for your kitchen
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl">
                Recommended suppliers
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                A trusted mix for produce, pantry, and daily staples.
              </p>
            </div>
            <Link
              to="/horeca/suppliers"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary hover:bg-primary hover:text-primary-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              View all suppliers{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier.name} supplier={supplier} />
            ))}
          </div>
        </section>

        <section className="border-t border-[#e8ece6] bg-[#fbfcfa] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Most ordered this week
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl">
                Popular products
              </h2>
            </div>
            <Link
              to="/horeca/products"
              className="hidden items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/75 sm:inline-flex"
            >
              Browse products{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {popularProducts.map((product) => (
              <PopularProductCard key={product.id} product={product} />
            ))}
          </div>
          <Link
            to="/horeca/products"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary hover:text-primary sm:hidden"
          >
            Browse all products{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </DashboardPageContent>
  );
}
