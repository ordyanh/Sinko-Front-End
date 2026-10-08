import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  Receipt,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { type CustomerOrderStatus } from "~/entities/horeca";
import { DashboardPageContent } from "~/shared/ui";
import {
  getClientProfile,
  getClientStats,
  getClientPricing,
  setClientProductPrice,
} from "~/shared/api";
import {
  getHorecaUsers,
  getLoggedInUser,
  getOrdersForSupplier,
  getSupplierProducts,
  saveSupplierProduct,
  type LoggedInUser,
  type StoredSupplierProduct,
} from "~/shared/lib/indexed-db";
import {
  IndividualPricesSection,
  type IndividualPrice,
  type IndividualPriceResource,
} from "~/features/individual-prices";

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

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("hy-AM", {
    style: "currency",
    currency: "AMD",
    maximumFractionDigits: 0,
  }).format(amount);
}

type SupplierCustomerProfile = {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  activityType: string;
  taxCode: string;
  status: "Active";
  totalOrders: number;
  recentOrders: Array<{
    id: string;
    date: string;
    status: CustomerOrderStatus;
    itemCount: number;
    total: number;
  }>;
};

function toSupplierCustomerProfile(user: LoggedInUser): SupplierCustomerProfile {
  return {
    id: user.id,
    companyName: user.companyName,
    email: user.email,
    phone: "Not provided",
    address: user.address,
    activityType: "HORECA",
    taxCode: "Not provided",
    status: "Active",
    totalOrders: 0,
    recentOrders: [],
  };
}

function sellingOptionResourceId(productId: string, sellingOptionId: string) {
  return `${productId}:${sellingOptionId}`;
}

export default function SupplierCustomerProfilePage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<SupplierCustomerProfile | null>();
  const [accountId, setAccountId] = useState<string>();
  const [supplierProducts, setSupplierProducts] = useState<StoredSupplierProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [priceSaveError, setPriceSaveError] = useState<string>();
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const [customers, user] = await Promise.all([
        getHorecaUsers(),
        getLoggedInUser(),
      ]);
      if (!isCurrent) return;

      if (user?.role === "supplier") {
        const [products, orders] = await Promise.all([
          getSupplierProducts(user.id),
          getOrdersForSupplier(user.id),
        ]);
        if (!isCurrent) return;

        setAccountId(user.id);
        setSupplierProducts(products);

        let remoteProfile = null;
        try {
          if (customerId) {
            remoteProfile = await getClientProfile(customerId);
          }
        } catch {
          // fallback
        }

        const horecaUser = customers.find((candidate) => candidate.id === customerId);
        const customerOrders = orders.filter((order) => order.horecaAccountId === customerId);
        if (remoteProfile) {
          setCustomer({
            id: remoteProfile.id || remoteProfile.clientId || customerId || "",
            companyName: remoteProfile.companyName || horecaUser?.companyName || "Client Company",
            email: remoteProfile.email || horecaUser?.email || "—",
            phone: remoteProfile.phoneNumber || "Not provided",
            address: remoteProfile.address || horecaUser?.address || "Yerevan",
            activityType: "HORECA",
            taxCode: remoteProfile.taxCode || remoteProfile.hvhh || "Not provided",
            status: "Active",
            totalOrders: remoteProfile.totalOrders ?? customerOrders.length,
            recentOrders: customerOrders.slice(0, 5).map((order) => ({
              id: order.id,
              date: order.placedAt,
              status: order.status,
              itemCount: order.lines.reduce(
                (count, line) => count + line.requestedQuantity,
                0,
              ),
              total: order.lines.reduce(
                (total, line) => total + line.offeredPrice * line.offeredQuantity,
                0,
              ),
            })),
          });
        } else {
          setCustomer(
            horecaUser
              ? {
                  ...toSupplierCustomerProfile(horecaUser),
                  totalOrders: customerOrders.length,
                  recentOrders: customerOrders.slice(0, 5).map((order) => ({
                    id: order.id,
                    date: order.placedAt,
                    status: order.status,
                    itemCount: order.lines.reduce(
                      (count, line) => count + line.requestedQuantity,
                      0,
                    ),
                    total: order.lines.reduce(
                      (total, line) => total + line.offeredPrice * line.offeredQuantity,
                      0,
                    ),
                  })),
                }
              : null,
          );
        }
      } else {
        const horecaUser = customers.find((candidate) => candidate.id === customerId);
        setCustomer(horecaUser ? toSupplierCustomerProfile(horecaUser) : null);
      }
      setIsLoadingProducts(false);
    })()
      .catch(() => {
        if (!isCurrent) return;
        setCustomer(null);
        setIsLoadingProducts(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [customerId]);

  const individualPriceResources: IndividualPriceResource[] = supplierProducts.flatMap(
    (product) =>
      product.sellingOptions.map((option) => ({
        id: sellingOptionResourceId(product.id, option.id),
        label: `${product.name} · ${option.quantity} ${option.unitType}`,
        description: `Minimum order: ${option.minimumOrderQuantity}`,
        originalPrice: option.price,
        imageUrl: product.imageUrl ?? "",
      })),
  );
  const customerPrices: IndividualPrice[] = customer
    ? supplierProducts.flatMap((product) =>
        product.sellingOptions.flatMap((option) =>
          option.companyPrices
            .filter((price) => price.resourceId === customer.id)
            .map((price) => ({
              resourceId: sellingOptionResourceId(product.id, option.id),
              individualPrice: price.individualPrice,
            })),
        ),
      )
    : [];

  async function saveCustomerPrices(prices: IndividualPrice[]) {
    if (!accountId || !customer) return;

    const pricesBySellingOption = new Map(
      prices.map((price) => [price.resourceId, price.individualPrice]),
    );
    const updatedProducts = supplierProducts.map((product) => ({
      ...product,
      sellingOptions: product.sellingOptions.map((option) => {
        const individualPrice = pricesBySellingOption.get(
          sellingOptionResourceId(product.id, option.id),
        );
        const otherCompanyPrices = option.companyPrices.filter(
          (price) => price.resourceId !== customer.id,
        );

        return {
          ...option,
          companyPrices:
            individualPrice === undefined
              ? otherCompanyPrices
              : [
                  ...otherCompanyPrices,
                  { resourceId: customer.id, individualPrice },
                ],
        };
      }),
    }));

    setSupplierProducts(updatedProducts);
    setPriceSaveError(undefined);
    setIsSavingPrices(true);
    try {
      await Promise.all(updatedProducts.map((product) => saveSupplierProduct(product)));
      // Also send each individual price to the backend API
      await Promise.allSettled(
        prices.map(async (p) => {
          const rawProdId = parseInt(p.resourceId.split(":")[0]?.replace(/\D/g, "") || "", 10);
          if (rawProdId > 0 && customer.id) {
            await setClientProductPrice(customer.id, rawProdId, p.individualPrice);
          }
        }),
      );
    } catch {
      setPriceSaveError("We couldn't save company prices. Please try again.");
    } finally {
      setIsSavingPrices(false);
    }
  }

  if (customer === undefined) {
    return (
      <DashboardPageContent>
        <p className="py-8 text-center text-sm text-slate-500">
          Loading customer...
        </p>
      </DashboardPageContent>
    );
  }

  if (!customer) {
    return (
      <DashboardPageContent>
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">
            Customer not found
          </p>
          <p className="mt-2 text-sm text-slate-600">
            This customer may no longer exist.
          </p>
          <Link
            to="/supplier/customers"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to customers
          </Link>
        </section>
      </DashboardPageContent>
    );
  }

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/supplier/customers"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to customers
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {customer.companyName}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  customer.status === "Active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {customer.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              HORECA customer · {customer.totalOrders} total orders
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Order history
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The 5 most recent orders placed by this customer.
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              {customer.recentOrders.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  This customer hasn&apos;t placed any orders yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {customer.recentOrders.map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {order.id}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(order.date)} · {order.itemCount} items
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClasses[order.status]}`}
                        >
                          {order.status}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() =>
                  navigate(`/supplier/orders?customerId=${customer.id}`)
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                View all orders
              </button>
            </section>

            {isLoadingProducts ? (
              <p className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
                Loading supplier products...
              </p>
            ) : (
              <IndividualPricesSection
                resourceLabel="Selling option"
                resourceLabelPlural="selling options"
                title="Company prices"
                description="Set a fixed price for a specific product packaging option. It applies only when this company orders that unit."
                resources={individualPriceResources}
                initialPrices={customerPrices}
                resetKey={customer.id}
                formatPrice={formatCurrency}
                idPrefix={`customer-${customer.id}-selling-option-price`}
                onPricesChange={saveCustomerPrices}
              />
            )}
            {isSavingPrices ? (
              <p className="text-sm text-slate-500">Saving company prices...</p>
            ) : null}
            {priceSaveError ? (
              <p role="alert" className="text-sm text-red-700">{priceSaveError}</p>
            ) : null}
          </div>

          <section className="h-fit space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-semibold text-slate-900">
              Customer profile
            </h2>

            <dl className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs font-medium text-slate-500">Email</dt>
                  <dd className="text-slate-900">{customer.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs font-medium text-slate-500">Phone</dt>
                  <dd className="text-slate-900">{customer.phone}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Address
                  </dt>
                  <dd className="text-slate-900">{customer.address}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Activity type
                  </dt>
                  <dd className="text-slate-900">{customer.activityType}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Receipt
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Tax code
                  </dt>
                  <dd className="text-slate-900">{customer.taxCode}</dd>
                </div>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </DashboardPageContent>
  );
}
