import { ArrowRight, Layers3, MapPin, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getSupplierCategories,
  getSupplierProfile,
  getSupplierUsers,
} from "~/shared/lib/indexed-db";
import { DashboardPageContent } from "~/shared/ui";

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
          Product categories
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
          View supplier <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default function HorecaSuppliersPage() {
  const [suppliers, setSuppliers] = useState<DirectorySupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const supplierUsers = await getSupplierUsers();
      const directorySuppliers = await Promise.all(
        supplierUsers.map(async (supplier) => {
          const [categories, profile] = await Promise.all([
            getSupplierCategories(supplier.id),
            getSupplierProfile(supplier.id),
          ]);
          const categoriesById = new Map(
            categories.map((category) => [category.id, category.name]),
          );
          const selectedCategories = profile.categoryIds
            .map((categoryId) => categoriesById.get(categoryId))
            .filter((category): category is string => Boolean(category));

          return {
            // Supplier usernames are the directory slugs used by the detail route.
            id: supplier.username,
            name: supplier.companyName,
            initials: getSupplierInitials(supplier.companyName),
            categories: selectedCategories,
            serviceArea: "Available through Synko",
            description:
              profile.description ||
              `${supplier.companyName} is available to receive orders through Synko.`,
          };
        }),
      );

      if (!isCurrent) return;

      setSuppliers(directorySuppliers);
      setLoadError(null);
    })()
      .catch(() => {
        if (isCurrent) {
          setLoadError("We couldn't load the supplier directory. Please try again.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <DashboardPageContent>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Store className="h-4 w-4" aria-hidden="true" />
              Supplier directory
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Your supply network
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Browse the suppliers available to your kitchen and see what each one delivers.
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-slate-500">
            {isLoading ? (
              "Loading suppliers…"
            ) : (
              <>
                <span className="font-bold text-slate-950 tabular-nums">{suppliers.length}</span> suppliers
              </>
            )}
          </p>
        </header>

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
        ) : suppliers.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
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
