import {
  CalendarDays,
  Check,
  ChevronLeft,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

export type SearchFilterOperator = "is" | "is-not";

export type SearchFilterOption = {
  value: string;
  label: string;
};

export type SearchFilterDefinition = {
  id: string;
  label: string;
  options: SearchFilterOption[];
};

export type SearchFilterValue = {
  id: string;
  filterId: string;
  operator: SearchFilterOperator;
  value: string;
};

type SearchFilterProps = {
  filters: SearchFilterDefinition[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  selectedFilters?: SearchFilterValue[];
  defaultSelectedFilters?: SearchFilterValue[];
  onSelectedFiltersChange?: (filters: SearchFilterValue[]) => void;
  dateFilterValue?: string;
  defaultDateFilterValue?: string;
  onDateFilterChange?: (value: string) => void;
  dateFilterLabel?: string;
  placeholder?: string;
  className?: string;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function makeFilterId(index: number) {
  return `search-filter-${Date.now()}-${index}`;
}

function formatDateFilterValue(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function SearchFilter({
  filters,
  value,
  defaultValue = "",
  onValueChange,
  selectedFilters,
  defaultSelectedFilters = [],
  onSelectedFiltersChange,
  dateFilterValue,
  defaultDateFilterValue = "",
  onDateFilterChange,
  dateFilterLabel = "Created date",
  placeholder = "Search",
  className,
}: SearchFilterProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledFilters, setUncontrolledFilters] = useState(
    defaultSelectedFilters,
  );
  const [uncontrolledDateFilterValue, setUncontrolledDateFilterValue] =
    useState(defaultDateFilterValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [draftFilterId, setDraftFilterId] = useState<string | null>(null);
  const [operator, setOperator] = useState<SearchFilterOperator>("is");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterIdCountRef = useRef(0);
  const inputId = useId();

  const searchValue = value ?? uncontrolledValue;
  const appliedFilters = selectedFilters ?? uncontrolledFilters;
  const selectedDateFilterValue =
    dateFilterValue ?? uncontrolledDateFilterValue;
  const showsDateFilter =
    dateFilterValue !== undefined ||
    onDateFilterChange !== undefined ||
    defaultDateFilterValue.length > 0;
  const draftFilter = filters.find((filter) => filter.id === draftFilterId);
  const selectedFilterIds = new Set(
    appliedFilters.map((filter) => filter.filterId),
  );

  useEffect(() => {
    function closeWhenClickedAway(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsDateFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", closeWhenClickedAway);
    return () => document.removeEventListener("mousedown", closeWhenClickedAway);
  }, []);

  function changeSearchValue(nextValue: string) {
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }

    onValueChange?.(nextValue);
  }

  function changeFilters(nextFilters: SearchFilterValue[]) {
    if (selectedFilters === undefined) {
      setUncontrolledFilters(nextFilters);
    }

    onSelectedFiltersChange?.(nextFilters);
  }

  function changeDateFilter(nextValue: string) {
    if (dateFilterValue === undefined) {
      setUncontrolledDateFilterValue(nextValue);
    }

    onDateFilterChange?.(nextValue);
  }

  function selectFilter(filterId: string) {
    if (selectedFilterIds.has(filterId)) return;

    setDraftFilterId(filterId);
    setOperator("is");
    setIsDateFilterOpen(false);
    setIsOpen(true);
  }

  function selectValue(nextValue: string) {
    if (!draftFilter) return;

    filterIdCountRef.current += 1;
    changeFilters([
      ...appliedFilters,
      {
        id: makeFilterId(filterIdCountRef.current),
        filterId: draftFilter.id,
        operator,
        value: nextValue,
      },
    ]);
    setDraftFilterId(null);
    setOperator("is");
    setIsOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function removeFilter(filterId: string) {
    changeFilters(appliedFilters.filter((filter) => filter.id !== filterId));
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    changeSearchValue(event.target.value);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "Backspace" && !searchValue && appliedFilters.length > 0) {
      removeFilter(appliedFilters.at(-1)!.id);
    }
  }

  return (
    <div ref={rootRef} className={joinClassNames("relative", className)}>
      <div
        className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/75 px-2 py-1.5 text-slate-400 shadow-inner shadow-slate-950/[0.015] transition duration-150 focus-within:border-primary/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10"
      >
        <Search className="ml-1 h-4 w-4 shrink-0" aria-hidden="true" />

        {filters.length > 0 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsDateFilterOpen(false);
              setIsOpen((current) => !current);
            }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Add a filter"
            aria-expanded={isOpen}
          >
            <ListFilter className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        {showsDateFilter ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
              setIsDateFilterOpen((current) => !current);
            }}
            className={joinClassNames(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selectedDateFilterValue
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-primary",
            )}
            aria-label={`Filter by ${dateFilterLabel.toLowerCase()}`}
            aria-expanded={isDateFilterOpen}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {selectedDateFilterValue
                ? formatDateFilterValue(selectedDateFilterValue)
                : dateFilterLabel}
            </span>
          </button>
        ) : null}

        {appliedFilters.map((filter) => {
          const definition = filters.find(
            (candidate) => candidate.id === filter.filterId,
          );
          const option = definition?.options.find(
            (candidate) => candidate.value === filter.value,
          );

          if (!definition || !option) return null;

          return (
            <span
              key={filter.id}
              className="inline-flex max-w-full items-center gap-1 rounded-lg border border-primary/15 bg-primary/10 py-1 pl-2 pr-1 text-xs font-semibold text-primary"
            >
              <span className="truncate">{definition.label}</span>
              <span className="font-medium text-primary/70">
                {filter.operator === "is" ? "is" : "is not"}
              </span>
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFilter(filter.id);
                }}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-primary/70 transition hover:bg-primary/15 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Remove ${definition.label} ${filter.operator === "is" ? "is" : "is not"} ${option.label} filter`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          );
        })}

        {draftFilter ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/35 bg-primary/5 py-1 pl-2 pr-1 text-xs font-semibold text-primary">
            {draftFilter.label}
            <span className="font-medium text-primary/65">choose a value</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDraftFilterId(null);
              }}
              className="inline-flex h-4 w-4 items-center justify-center rounded text-primary/70 transition hover:bg-primary/15 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Cancel ${draftFilter.label} filter`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ) : null}

        <label className="min-w-30 flex flex-1 items-center">
          <span className="sr-only">{placeholder}</span>
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            value={searchValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={appliedFilters.length || draftFilter ? "Search" : placeholder}
            className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>

      </div>

      {isOpen && filters.length > 0 ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
          {draftFilter ? (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
                <button
                  type="button"
                  onClick={() => setDraftFilterId(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Choose another filter"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {draftFilter.label}
                  </p>
                  <p className="text-xs text-slate-500">Choose a value</p>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5">
                {draftFilter.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectValue(option.value)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-primary/5 hover:text-slate-950 focus:outline-none focus-visible:bg-primary/10"
                  >
                    {option.label}
                    <Check className="h-4 w-4 text-primary opacity-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <span className="text-xs font-medium text-slate-500">Match items</span>
                <div className="rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                  {(["is", "is-not"] as const).map((nextOperator) => (
                    <button
                      key={nextOperator}
                      type="button"
                      onClick={() => setOperator(nextOperator)}
                      className={joinClassNames(
                        "rounded-md px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        operator === nextOperator
                          ? "bg-primary text-primary-content shadow-sm"
                          : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {nextOperator === "is" ? "is" : "is not"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Add a filter</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Narrow this list by one of its fields.
                </p>
              </div>
              <div className="p-1.5">
                {filters.map((filter) => {
                  const isSelected = selectedFilterIds.has(filter.id);

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => selectFilter(filter.id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-primary/5 hover:text-slate-950 focus:outline-none focus-visible:bg-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {filter.label}
                      <span className="text-xs font-medium text-slate-400">
                        {isSelected ? "Added" : `${filter.options.length} options`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}

      {isDateFilterOpen && showsDateFilter ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(100%,18rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10">
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">
              {dateFilterLabel}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Show items created on this date.
            </span>
            <input
              type="date"
              value={selectedDateFilterValue}
              onChange={(event) => changeDateFilter(event.target.value)}
              className="mt-3 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => changeDateFilter("")}
              disabled={!selectedDateFilterValue}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsDateFilterOpen(false)}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-content transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
