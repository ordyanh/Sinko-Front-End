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
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  formatAmd,
  formatOrderDate,
  getHorecaOrders,
  horecaOrderStatusClasses,
  horecaOrderStatusLabels,
} from "~/entities/horeca";
import {
  formatMarketplacePrice,
  getMarketplaceOptionLabel,
  getMarketplaceProductPrice,
  getMarketplaceSellingOptions,
  marketplaceProducts,
} from "~/entities/product";
import { getMarketplaceSupplierById } from "~/entities/supplier";
import { getVisibleSupplierPromotions, PromotionCard } from "~/entities/promotion";
import { DashboardPageContent } from "~/shared/ui";

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
  const { supplierId = "" } = useParams();
  const supplier = getMarketplaceSupplierById(supplierId);

  if (!supplier) {
    return (
      <DashboardPageContent>
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Supplier not found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose a supplier from your directory to see their details.
          </p>
          <Link
            to="/horeca/suppliers"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to suppliers
          </Link>
        </section>
      </DashboardPageContent>
    );
  }

  const supplierProducts = marketplaceProducts
    .filter((product) => product.supplier === supplier.name)
    .slice(0, 3);
  const supplierOrders = supplier.orderSupplierId
    ? getHorecaOrders()
        .filter((order) => order.supplierId === supplier.orderSupplierId)
        .slice(0, 3)
    : [];
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
          All suppliers
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
                    Supplier profile
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
                  Delivery {supplier.deliveryWindow}
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
              Delivery area
            </div>
            <p className="mt-3 text-lg font-bold tracking-tight text-slate-950">
              {supplier.serviceArea}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{supplier.address}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
              Ordering contact
            </div>
            <p className="mt-3 text-lg font-bold tracking-tight text-slate-950">
              {supplier.contactName}
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <a className="block w-fit hover:text-primary" href={`tel:${supplier.phone.replaceAll(" ", "")}`}>
                {supplier.phone}
              </a>
              <a className="flex w-fit items-center gap-1.5 hover:text-primary" href={`mailto:${supplier.email}`}>
                <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                {supplier.email}
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Package className="h-4 w-4" aria-hidden="true" />
                Current catalogue
              </div>
              <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-slate-950">
                Products from {supplier.name}
              </h2>
            </div>
            <DetailLink to={productsHref}>View all products</DetailLink>
          </div>

          {supplierProducts.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {supplierProducts.map((product) => (
                <Link
                  key={product.id}
                  to={productsHref}
                  className="group flex min-w-0 gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <img src={product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 py-0.5">
                    <p className="text-sm font-bold leading-5 tracking-tight text-slate-900">
                      {product.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500" title={getMarketplaceSellingOptions(product).map(getMarketplaceOptionLabel).join(", ")}>{getMarketplaceSellingOptions(product).map(getMarketplaceOptionLabel).join(" · ")}</p>
                    <p className="mt-3 text-sm font-bold text-slate-950 tabular-nums">
                      {formatMarketplacePrice(getMarketplaceProductPrice(product))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No products are listed yet.</p>
          )}
        </section>

        {supplierPromotions.length > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  Supplier offers
                </div>
                <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-slate-950">Current offers from {supplier.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Review this supplier&apos;s active promotions before adding products to your order.</p>
              </div>
              <span className="text-sm font-semibold text-slate-500"><span className="font-bold text-slate-950">{supplierPromotions.length}</span> active {supplierPromotions.length === 1 ? "offer" : "offers"}</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">{supplierPromotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}</div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                Purchase history
              </div>
              <h2 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-slate-950">
                Orders to {supplier.name}
              </h2>
            </div>
            <DetailLink to={ordersHref}>View all orders</DetailLink>
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
                      Placed {formatOrderDate(order.placedAt)} · {order.lines.length} items
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${horecaOrderStatusClasses[order.status]}`}>
                      {horecaOrderStatusLabels[order.status]}
                    </span>
                    <span className="text-sm font-bold text-slate-950 tabular-nums">
                      {formatAmd(order.lines.reduce((total, line) => total + line.offeredPrice * line.offeredQuantity, 0))}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No orders have been placed with this supplier yet.</p>
          )}
        </section>
      </div>
    </DashboardPageContent>
  );
}
