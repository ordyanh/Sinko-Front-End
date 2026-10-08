import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Check, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import Modal from "~/shared/ui/modal";

export type IndividualPriceResource = {
  id: string;
  label: string;
  originalPrice: number;
  imageUrl: string;
  description?: string;
};

export type IndividualPrice = {
  resourceId: string;
  individualPrice: number;
};

type IndividualPriceFormValues = {
  prices: IndividualPrice[];
};

type IndividualPricesSectionProps = {
  resourceLabel: string;
  resourceLabelPlural: string;
  resources: IndividualPriceResource[];
  initialPrices?: IndividualPrice[];
  resetKey: string;
  formatPrice: (value: number) => string;
  showOriginalPriceInResourceSelection?: boolean;
  title?: string;
  description?: string;
  variant?: "default" | "embedded";
  idPrefix?: string;
  onPricesChange?: (prices: IndividualPrice[]) => void;
};

function getInitialPrices(
  resources: IndividualPriceResource[],
  initialPrices: IndividualPrice[],
) {
  const resourceIds = new Set(resources.map((resource) => resource.id));

  return initialPrices.filter((price) => resourceIds.has(price.resourceId));
}

export default function IndividualPricesSection({
  resourceLabel,
  resourceLabelPlural,
  resources,
  initialPrices = [],
  resetKey,
  formatPrice,
  showOriginalPriceInResourceSelection = true,
  title = "Individual prices",
  description,
  variant = "default",
  idPrefix = "individual-price",
  onPricesChange,
}: IndividualPricesSectionProps) {
  const [prices, setPrices] = useState<IndividualPrice[]>(() =>
    getInitialPrices(resources, initialPrices),
  );
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    () => getInitialPrices(resources, initialPrices).map((price) => price.resourceId),
  );
  const { control, getValues, register, reset } =
    useForm<IndividualPriceFormValues>({
      defaultValues: { prices },
    });
  const { fields } = useFieldArray({
    control,
    name: "prices",
    keyName: "fieldId",
  });
  const watchedPrices = useWatch({ control, name: "prices" });
  const onPricesChangeRef = useRef(onPricesChange);

  useEffect(() => {
    onPricesChangeRef.current = onPricesChange;
  }, [onPricesChange]);

  useEffect(() => {
    onPricesChangeRef.current?.(
      (watchedPrices ?? []).map((price) => ({
        resourceId: price.resourceId,
        individualPrice: Number(price.individualPrice) || 0,
      })),
    );
  }, [watchedPrices]);

  const resourcesById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  useEffect(() => {
    const nextPrices = getInitialPrices(resources, initialPrices);
    setPrices(nextPrices);
    setSelectedResourceIds(nextPrices.map((price) => price.resourceId));
  }, [resetKey]);

  useEffect(() => {
    reset({ prices });
  }, [prices, reset]);

  const hasPrices = prices.length > 0;
  const normalizedResourceSearch = resourceSearch.trim().toLowerCase();
  const filteredResources = resources.filter((resource) =>
    [resource.label, resource.description ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedResourceSearch),
  );

  function openSelector() {
    setSelectedResourceIds(prices.map((price) => price.resourceId));
    setResourceSearch("");
    setIsSelectorOpen(true);
  }

  function toggleResource(resourceId: string) {
    setSelectedResourceIds((currentIds) =>
      currentIds.includes(resourceId)
        ? currentIds.filter((id) => id !== resourceId)
        : [...currentIds, resourceId],
    );
  }

  function applyResourceSelection() {
    const currentPrices = new Map(
      getValues("prices").map((price) => [price.resourceId, price.individualPrice]),
    );

    setPrices(
      selectedResourceIds.flatMap((resourceId) => {
        const resource = resourcesById.get(resourceId);
        if (!resource) return [];

        return [
          {
            resourceId,
            individualPrice:
              currentPrices.get(resourceId) ?? resource.originalPrice,
          },
        ];
      }),
    );
    setIsSelectorOpen(false);
  }

  return (
    <section className={variant === "embedded" ? "mt-4 rounded-xl border border-slate-200 bg-white p-4" : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={variant === "embedded" ? "text-sm font-semibold text-slate-900" : "text-lg font-semibold text-slate-900"}>{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {description ?? (variant === "embedded"
              ? `Set a fixed price that overrides this option's standard price for selected ${resourceLabelPlural}.`
              : `Set a price that overrides the standard price for selected ${resourceLabelPlural}.`)}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {hasPrices ? (
        <>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={openSelector}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Change {resourceLabelPlural}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">{resourceLabel}</th>
                  <th className="px-4 py-3">Original price</th>
                  <th className="px-4 py-3">Individual price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fields.map((price, index) => {
                  const resource = resourcesById.get(price.resourceId);
                  if (!resource) return null;

                  return (
                    <tr key={price.fieldId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{resource.label}</p>
                        {resource.description ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {resource.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatPrice(resource.originalPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <label className="sr-only" htmlFor={`${idPrefix}-${price.resourceId}`}>
                          Individual price for {resource.label}
                        </label>
                        <input
                          id={`${idPrefix}-${price.resourceId}`}
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                          {...register(`prices.${index}.individualPrice`, {
                            valueAsNumber: true,
                            min: 0,
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={openSelector}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
        >
          <UsersRound className="h-4 w-4" aria-hidden="true" />
          Select {resourceLabelPlural} to set individual prices
        </button>
      )}

      <Modal
        isOpen={isSelectorOpen}
        title={`Select ${resourceLabelPlural}`}
        description={`Choose the ${resourceLabelPlural} that need an individual price.`}
        onClose={() => setIsSelectorOpen(false)}
        size="md"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label
                htmlFor={`${idPrefix}-search`}
                className="text-sm font-medium text-slate-900"
              >
                {resourceLabelPlural}
              </label>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {selectedResourceIds.length} selected
              </span>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id={`${idPrefix}-search`}
                type="search"
                value={resourceSearch}
                onChange={(event) => setResourceSearch(event.target.value)}
                placeholder={`Search ${resourceLabelPlural}`}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
          </div>

          {filteredResources.length > 0 ? (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredResources.map((resource) => {
                const isSelected = selectedResourceIds.includes(resource.id);

                return (
                  <li key={resource.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition ${
                        isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                      }`}
                    >
                      {resource.imageUrl ? (
                        <img
                          src={resource.imageUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-xs font-bold text-white ring-1 ring-slate-200">
                          {resource.label.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {resource.label}
                        </span>
                        {resource.description ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {resource.description}
                          </span>
                        ) : null}
                      </span>
                      {showOriginalPriceInResourceSelection ? (
                        <span className="hidden text-sm font-medium text-slate-500 sm:block">
                          {formatPrice(resource.originalPrice)}
                        </span>
                      ) : null}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleResource(resource.id)}
                        className="h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-4 focus:ring-primary/15"
                        aria-label={`Select ${resource.label}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No {resourceLabelPlural} match your search.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsSelectorOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyResourceSelection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Apply selection
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
