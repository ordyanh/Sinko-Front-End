import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

export type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemName?: string;
  showPageNumbers?: boolean;
};

export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

export default function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className = "",
  itemName = "items",
  showPageNumbers = true,
}: PaginationProps) {
  const safePageSize = pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const endItem = Math.min(currentPage * safePageSize, totalCount);

  const handlePageSizeChange = (newSize: number) => {
    if (!onPageSizeChange) return;
    onPageSizeChange(newSize);
    // Adjust current page if it would now be out of bounds
    const newTotalPages = Math.max(1, Math.ceil(totalCount / newSize));
    if (currentPage > newTotalPages) {
      onPageChange(newTotalPages);
    }
  };

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <p>
          Showing{" "}
          <span className="font-semibold text-slate-800 tabular-nums">
            {startItem}-{endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800 tabular-nums">
            {totalCount}
          </span>{" "}
          {itemName}
        </p>

        {onPageSizeChange && pageSizeOptions.length > 0 ? (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <label
              htmlFor="pagination-page-size"
              className="text-xs font-medium text-slate-500"
            >
              Per page:
            </label>
            <select
              id="pagination-page-size"
              aria-label="Select number of items per page"
              value={safePageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-1 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {showPageNumbers ? (
          <div className="flex items-center gap-1">
            {getPageNumbers().map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="grid h-8 w-6 place-items-center text-xs font-semibold text-slate-400 select-none"
                  >
                    …
                  </span>
                );
              }
              const isSelected = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={isSelected ? "page" : undefined}
                  className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                    isSelected
                      ? "bg-primary text-primary-content shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="min-w-20 text-center text-xs font-semibold uppercase tracking-widest text-slate-500 tabular-nums">
            {currentPage} / {totalPages}
          </span>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
