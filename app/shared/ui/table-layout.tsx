import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import IconButton from "./icon-button";
import SearchFilter, {
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "./search-filter";

export type TableColumn<Row> = {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type TableRowAction<Row> = {
  label: string | ((row: Row) => string);
  icon: ReactNode;
  onClick: (row: Row) => void;
  disabled?: (row: Row) => boolean;
  variant?: "default" | "danger";
};

type TableLayoutProps<Row> = {
  title: string;
  icon: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  additionalContent?: ReactNode;
  searchPrefix?: ReactNode;
  searchSuffix?: ReactNode;
  searchValue?: string;
  defaultSearchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchFilters?: SearchFilterDefinition[];
  selectedSearchFilters?: SearchFilterValue[];
  defaultSelectedSearchFilters?: SearchFilterValue[];
  onSelectedSearchFiltersChange?: (filters: SearchFilterValue[]) => void;
  dateFilterValue?: string;
  defaultDateFilterValue?: string;
  onDateFilterChange?: (value: string) => void;
  dateFilterLabel?: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => string | number;
  rowActions?: TableRowAction<Row>[];
  rowLink?: (row: Row) => string;
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  totalCount?: number;
  className?: string;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export default function TableLayout<Row>({
  title,
  icon,
  primaryAction,
  secondaryActions,
  additionalContent,
  searchPrefix,
  searchSuffix,
  searchValue,
  defaultSearchValue = "",
  onSearchChange,
  searchPlaceholder = "Search",
  searchFilters = [],
  selectedSearchFilters,
  defaultSelectedSearchFilters,
  onSelectedSearchFiltersChange,
  dateFilterValue,
  defaultDateFilterValue,
  onDateFilterChange,
  dateFilterLabel,
  columns,
  rows,
  getRowKey,
  rowActions = [],
  rowLink,
  isLoading = false,
  errorMessage,
  emptyMessage = "No results found.",
  page,
  defaultPage = 1,
  onPageChange,
  pageSize = 10,
  totalCount = rows.length,
  className,
}: TableLayoutProps<Row>) {
  const [uncontrolledSearchValue, setUncontrolledSearchValue] =
    useState(defaultSearchValue);
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const navigate = useNavigate();
  const currentSearchValue = searchValue ?? uncontrolledSearchValue;
  const currentPage = page ?? uncontrolledPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPageStart =
    totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const currentPageEnd = Math.min(currentPage * pageSize, totalCount);
  const columnCount = columns.length + (rowActions.length > 0 ? 1 : 0);

  function handleSearchChange(nextValue: string) {
    if (searchValue === undefined) setUncontrolledSearchValue(nextValue);
    onSearchChange?.(nextValue);
  }

  function changePage(nextPage: number) {
    const clampedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (page === undefined) {
      setUncontrolledPage(clampedPage);
    }

    onPageChange?.(clampedPage);
  }

  return (
    <div className={joinClassNames("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
        </div>

        {primaryAction || secondaryActions ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>

      {additionalContent ? <div>{additionalContent}</div> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-11 items-center gap-2 border-b border-slate-200 px-5 py-3 sm:px-6">
          {searchPrefix}
          <SearchFilter
            className="min-w-0 flex-1"
            value={currentSearchValue}
            onValueChange={handleSearchChange}
            placeholder={searchPlaceholder}
            filters={searchFilters}
            selectedFilters={selectedSearchFilters}
            defaultSelectedFilters={defaultSelectedSearchFilters}
            onSelectedFiltersChange={onSelectedSearchFiltersChange}
            dateFilterValue={dateFilterValue}
            defaultDateFilterValue={defaultDateFilterValue}
            onDateFilterChange={onDateFilterChange}
            dateFilterLabel={dateFilterLabel}
          />
          {searchSuffix}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={joinClassNames(
                      "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6",
                      index === 0
                        ? "sticky left-0 z-10 border-r border-slate-200"
                        : undefined,
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
                {rowActions.length > 0 ? (
                  <th
                    scope="col"
                    className="border-b border-slate-200 px-5 py-3.5 text-right sm:px-6"
                  >
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-5 py-14 text-center sm:px-6"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                      <LoaderCircle
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Loading...
                    </span>
                  </td>
                </tr>
              ) : errorMessage ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-5 py-14 text-center text-sm text-error sm:px-6"
                  >
                    {errorMessage}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-5 py-14 text-center text-sm text-slate-500 sm:px-6"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const rowKey = getRowKey(row, index);
                  const rowDestination = rowLink?.(row);

                  return (
                    <tr
                      key={rowKey}
                      className={joinClassNames(
                        "group transition-colors hover:bg-slate-50/80",
                        rowDestination ? "cursor-pointer" : undefined,
                      )}
                      onClick={
                        rowDestination
                          ? () => navigate(rowDestination)
                          : undefined
                      }
                      onKeyDown={
                        rowDestination
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(rowDestination);
                              }
                            }
                          : undefined
                      }
                      tabIndex={rowDestination ? 0 : undefined}
                      role={rowDestination ? "link" : undefined}
                    >
                      {columns.map((column, columnIndex) => (
                        <td
                          key={column.id}
                          className={joinClassNames(
                            "px-5 py-4 sm:px-6",
                            columnIndex === 0
                              ? "sticky left-0 z-10 border-r border-slate-200 bg-white transition-colors group-hover:bg-slate-50"
                              : undefined,
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      {rowActions.length > 0 ? (
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex justify-end gap-1">
                            {rowActions.map((action) => {
                              const actionLabel =
                                typeof action.label === "function"
                                  ? action.label(row)
                                  : action.label;

                              return (
                                <IconButton
                                  key={`${String(rowKey)}-${actionLabel}`}
                                  icon={action.icon}
                                  label={actionLabel}
                                  size="sm"
                                  variant={action.variant ?? "default"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    action.onClick(row);
                                  }}
                                  disabled={action.disabled?.(row)}
                                />
                              );
                            })}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {currentPageStart}-{currentPageEnd}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">{totalCount}</span>
          </p>
          <div className="flex items-center gap-1">
            <IconButton
              icon={<ChevronLeft aria-hidden="true" />}
              label="Previous page"
              className="rounded-full border border-slate-200 hover:border-slate-300"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
            />
            <span className="min-w-20 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
              {currentPage} / {totalPages}
            </span>
            <IconButton
              icon={<ChevronRight aria-hidden="true" />}
              label="Next page"
              className="rounded-full border border-slate-200 hover:border-slate-300"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            />
          </div>
        </footer>
      </section>
    </div>
  );
}
