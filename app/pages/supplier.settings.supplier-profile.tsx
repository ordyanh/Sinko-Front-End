import { Tags, Store } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "~/shared/ui/button";
import Select from "~/shared/ui/form/select";
import { DashboardPageContent } from "~/shared/ui";
import { useToast } from "~/shared/ui/toast";
import {
  createSupplierCategory,
  getLoggedInUser,
  getSupplierCategories,
  getSupplierProfile,
  saveSupplierProfile,
  type StoredSupplierCategory,
} from "~/shared/lib/indexed-db";

export default function SupplierProfilePage() {
  const { showToast } = useToast();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoredSupplierCategory[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "supplier") return;

      const [storedCategories, profile] = await Promise.all([
        getSupplierCategories(user.id),
        getSupplierProfile(user.id),
      ]);
      if (!isCurrent) return;

      setAccountId(user.id);
      setCategories(storedCategories);
      setCategoryIds(profile.categoryIds);
      setDescription(profile.description);
      setIsLoading(false);
    })().catch(() => {
      if (!isCurrent) return;
      setError("We couldn't load your supplier profile.");
      setIsLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleCategoriesChange(nextValue: string | string[]) {
    if (!accountId) return;

    const nextValues = Array.isArray(nextValue) ? nextValue : [nextValue];
    const categoryIdsByName = new Map(
      categories.map((category) => [category.name.toLocaleLowerCase(), category.id]),
    );

    try {
      const resolvedCategoryIds = await Promise.all(
        nextValues.map(async (value) => {
          if (categories.some((category) => category.id === value)) return value;

          const knownId = categoryIdsByName.get(value.toLocaleLowerCase());
          if (knownId) return knownId;

          const category = await createSupplierCategory(accountId, value);
          setCategories((currentCategories) =>
            currentCategories.some((current) => current.id === category.id)
              ? currentCategories
              : [...currentCategories, category].sort((first, second) =>
                  first.name.localeCompare(second.name),
                ),
          );
          return category.id;
        }),
      );
      setCategoryIds([...new Set(resolvedCategoryIds)]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't add that category.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) return;

    setIsSaving(true);
    try {
      await saveSupplierProfile({
        accountId,
        categoryIds,
        description: description.trim(),
      });
      showToast({
        title: "Supplier profile updated",
        description: "Your categories and public description have been saved.",
        variant: "success",
      });
    } catch {
      setError("We couldn't save your supplier profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardPageContent>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Supplier profile
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Supplier categories
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Choose the categories you sell and tell buyers a little about your business.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Tags className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search for a category or add a new one to use it in your catalog.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="supplier-categories" className="mb-2 block text-sm font-medium text-slate-900">
              Product categories
            </label>
            <Select
              id="supplier-categories"
              multiple
              creatable
              createLabel={(value) => `Add “${value}”`}
              disabled={isLoading || isSaving}
              value={categoryIds}
              onValueChange={handleCategoriesChange}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-sm text-slate-500">
              New categories are saved to your supplier catalog automatically.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Supplier description</h2>
              <p className="mt-1 text-sm text-slate-500">
                This description helps buyers understand what your business offers.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="supplier-description" className="mb-2 block text-sm font-medium text-slate-900">
              Description
            </label>
            <textarea
              id="supplier-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isLoading || isSaving}
              rows={6}
              placeholder="Describe your products, sourcing, and delivery service."
              className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </section>

        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="w-auto!" loading={isSaving} disabled={isLoading}>
          Save supplier profile
        </Button>
      </form>
    </DashboardPageContent>
  );
}
