import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Package,
  Plus,
  Power,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  DashboardTableContent,
  TableLayout,
  type TableColumn,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";
import Modal from "~/shared/ui/modal";
import {
  deleteSupplierProduct,
  getLoggedInUser,
  getSupplierCategories,
  getSupplierProducts,
  saveSupplierProduct,
  type StoredSupplierProduct,
  type SupplierProductStatus,
} from "~/shared/lib/indexed-db";

type SupplierProduct = {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  price: number;
  sellingOptions: Array<{
    label: string;
    price: number;
    minimumOrderQuantity: number;
  }>;
  code?: string;
  image: string;
  status: SupplierProductStatus;
  storedProduct: StoredSupplierProduct;
};

type ImportPreviewProduct = {
  row: number;
  name: string;
  category: string;
  price: string;
  code: string;
  issue?: string;
};

type CatalogNotice = {
  title: string;
  description: string;
};

function formatAmd(value: number) {
  return new Intl.NumberFormat("hy-AM", {
    style: "currency",
    currency: "AMD",
    maximumFractionDigits: 0,
  }).format(value);
}

const pageSize = 3;

const importPreviewProducts: ImportPreviewProduct[] = [
  {
    row: 2,
    name: "Ararat Mountain Spring Water",
    category: "Beverages",
    price: "450 դրամ",
    code: "AMS-500",
  },
  {
    row: 3,
    name: "Stone Oven Lavash",
    category: "Bakery",
    price: "850 դրամ",
    code: "SOL-003",
  },
  {
    row: 4,
    name: "Areni Reserve Red Wine",
    category: "Beverages",
    price: "6,900 դրամ",
    code: "ARW-750",
  },
  {
    row: 5,
    name: "Sevan Trout Fillet",
    category: "Seafood",
    price: "4,200 դրամ",
    code: "STF-001",
  },
  {
    row: 6,
    name: "Harvest Apricot Preserve",
    category: "Pantry",
    price: "—",
    code: "HAP-310",
    issue: "Add a price before importing",
  },
];

const columns: TableColumn<SupplierProduct>[] = [
  {
    id: "product",
    header: "Product",
    cell: (product) => (
      <div className="flex items-center gap-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
            <Package className="h-5 w-5" aria-label="No product image" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {product.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{product.id}</p>
        </div>
      </div>
    ),
  },
  { id: "category", header: "Category", cell: (product) => product.category },
  {
    id: "selling-options",
    header: "Selling options",
    cell: (product) => (
      <div className="space-y-1.5 py-1">
        {product.sellingOptions.map((option) => (
          <p key={option.label} className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{option.label}</span>
            <span className="ml-1.5 tabular-nums">{formatAmd(option.price)}</span>
            <span className="ml-1.5 text-slate-400">min. {option.minimumOrderQuantity}</span>
          </p>
        ))}
      </div>
    ),
  },
  {
    id: "product-code",
    header: "Product Code",
    cell: (product) => product.code ?? "—",
  },
  {
    id: "status",
    header: "Status",
    cell: (product) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          product.status === "Active"
            ? "bg-emerald-50 text-emerald-700"
            : product.status === "Unlisted"
              ? "bg-amber-50 text-amber-800"
              : product.status === "Draft"
                ? "bg-sky-50 text-sky-700"
                : "bg-slate-200 text-slate-700"
        }`}
      >
        {product.status}
      </span>
    ),
  },
];

export default function SupplierProductsPage() {
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [createdDate, setCreatedDate] = useState("");
  const [page, setPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<"upload" | "preview">("upload");
  const [importMessageVisible, setImportMessageVisible] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState<CatalogNotice | null>(null);
  const [productToDelete, setProductToDelete] = useState<SupplierProduct | null>(null);

  const supplierProductSearchFilters: SearchFilterDefinition[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { value: "Active", label: "Active" },
        { value: "Unlisted", label: "Unlisted" },
        { value: "Inactive", label: "Inactive" },
        { value: "Draft", label: "Draft" },
      ],
    },
    {
      id: "category",
      label: "Category",
      options: Array.from(new Set(products.map((product) => product.category))).map(
        (category) => ({ value: category, label: category }),
      ),
    },
  ];

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!user || user.role !== "supplier") return;

      const [storedProducts, categories] = await Promise.all([
        getSupplierProducts(user.id),
        getSupplierCategories(user.id),
      ]);
      if (!isCurrent) return;

      const categoriesById = new Map(categories.map((category) => [category.id, category.name]));
      setAccountId(user.id);
      setProducts(
        storedProducts.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.categoryIds.map((id) => categoriesById.get(id)).filter(Boolean).join(", ") || "Uncategorized",
          createdAt: product.createdAt,
          price: product.sellingOptions[0]?.price ?? 0,
          sellingOptions: product.sellingOptions.map((option) => ({
            label: `${option.quantity} ${option.unitType}${option.unitType === "Package" && option.piecesPerPackage ? ` (${option.piecesPerPackage} pcs)` : ""}`,
            price: option.price,
            minimumOrderQuantity: option.minimumOrderQuantity,
          })),
          code: product.code,
          image: product.imageUrl ?? "",
          status: product.status,
          storedProduct: product,
        })),
      );
    })().catch(() => {
      if (isCurrent) {
        setCatalogNotice({ title: "Products unavailable", description: "We couldn't load your catalog." });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesSearch = [product.id, product.name, product.category, product.code ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchValue);
    const matchesFilters = selectedFilters.every((filter) => {
      const productValue =
        filter.filterId === "status" ? product.status : product.category;
      const doesMatch = productValue === filter.value;

      return filter.operator === "is" ? doesMatch : !doesMatch;
    });
    const matchesCreatedDate =
      !createdDate || product.createdAt === createdDate;

    return matchesSearch && matchesFilters && matchesCreatedDate;
  });

  const visibleProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

    if (page > lastPage) setPage(lastPage);
  }, [filteredProducts.length, page]);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPage(1);
  }

  function handleSelectedFiltersChange(filters: SearchFilterValue[]) {
    setSelectedFilters(filters);
    setPage(1);
  }

  function handleCreatedDateChange(value: string) {
    setCreatedDate(value);
    setPage(1);
  }

  function closeImportModal() {
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setImportStep("upload");
  }

  function handleOpenPreview() {
    if (!selectedFile) return;

    setImportStep("preview");
  }

  function handleStartImport() {
    setImportMessageVisible(true);
    closeImportModal();
  }

  async function handleToggleProductStatus(product: SupplierProduct) {
    if (!accountId) return;

    const nextStatus: SupplierProductStatus =
      product.status === "Active" ? "Unlisted" : "Active";
    try {
      await saveSupplierProduct({ ...product.storedProduct, status: nextStatus });
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id
            ? {
                ...currentProduct,
                status: nextStatus,
                storedProduct: { ...currentProduct.storedProduct, status: nextStatus },
              }
            : currentProduct,
        ),
      );
      setCatalogNotice({
        title: `${product.name} is now ${nextStatus.toLowerCase()}`,
        description:
          nextStatus === "Active"
            ? "Buyers can see and order this product again."
            : "This product is hidden from the buyer catalog but remains available to you.",
      });
    } catch {
      setCatalogNotice({
        title: "Status wasn't saved",
        description: "Please try changing the product status again.",
      });
    }
  }

  function closeDeleteModal() {
    setProductToDelete(null);
  }

  async function handleDeleteProduct() {
    if (!productToDelete || !accountId) return;

    try {
      await deleteSupplierProduct(accountId, productToDelete.id);
      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productToDelete.id),
      );
      setCatalogNotice({
        title: "Product deleted",
        description: `${productToDelete.name} has been removed from your catalog.`,
      });
      closeDeleteModal();
    } catch {
      setCatalogNotice({
        title: "Product wasn't deleted",
        description: "Please try deleting the product again.",
      });
    }
  }

  function handleDownloadSample() {
    const sample =
      "name,category,price,productCode\nOrganic Citrus Mix,Fresh Produce,18.50,OCM-204\n";
    const downloadUrl = URL.createObjectURL(
      new Blob([sample], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "products-import-sample.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <DashboardTableContent>
      <TableLayout
        title="Products"
        icon={<Package className="h-5 w-5" aria-hidden="true" />}
        primaryAction={
          <button
            type="button"
            onClick={() => navigate("/supplier/products/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add product
          </button>
        }
        secondaryActions={
          <button
            type="button"
            onClick={() => {
              setImportStep("upload");
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import from CSV
          </button>
        }
        additionalContent={
          importMessageVisible || catalogNotice ? (
            <div className="flex flex-col gap-3">
              {catalogNotice ? (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950"
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-sky-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{catalogNotice.title}</p>
                    <p className="mt-0.5 text-sm text-sky-800">
                      {catalogNotice.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCatalogNotice(null)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sky-700 transition hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                    aria-label="Dismiss catalog status"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              {importMessageVisible ? (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Import started</p>
                    <p className="mt-0.5 text-sm text-emerald-800">
                      We&apos;ll notify you when your products are ready.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportMessageVisible(false)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-emerald-700 transition hover:bg-emerald-100"
                    aria-label="Dismiss import status"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null
        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search products"
        searchFilters={supplierProductSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        dateFilterValue={createdDate}
        onDateFilterChange={handleCreatedDateChange}
        dateFilterLabel="Created date"
        columns={columns}
        rows={visibleProducts}
        getRowKey={(product) => product.id}
        rowLink={(product) => `/supplier/products/${product.id}`}
        rowActions={[
          {
            label: (product) =>
              product.status === "Active" ? "Unlist" : "List product",
            icon: <Power aria-hidden="true" />,
            onClick: handleToggleProductStatus,
          },
          {
            label: "Delete",
            icon: <Trash2 aria-hidden="true" />,
            variant: "danger",
            onClick: setProductToDelete,
          },
        ]}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        totalCount={filteredProducts.length}
        emptyMessage="No products match your search."
      />

      <Modal
        isOpen={isImportModalOpen}
        title={
          importStep === "upload"
            ? "Import products from CSV"
            : "Review your import"
        }
        description={
          importStep === "upload"
            ? "Upload a CSV file, then review the products before adding them to your catalog."
            : "Check the rows below. Valid products will be added when you confirm the import."
        }
        onClose={closeImportModal}
        size={importStep === "upload" ? "sm" : "lg"}
      >
        {importStep === "upload" ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3" aria-label="Import progress">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-content">
                  1
                </span>
                File
              </span>
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 text-[11px]">
                  2
                </span>
                Review
              </span>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <Upload className="h-7 w-7 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">
                {selectedFile ? selectedFile.name : "Choose a CSV file"}
              </span>
              <span className="text-xs text-slate-500">
                CSV files only, up to 10 MB
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setImportStep("upload");
                }}
              />
            </label>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Download className="h-4 w-4" aria-hidden="true" />
              <button
                type="button"
                onClick={handleDownloadSample}
                className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition hover:text-primary/80 hover:decoration-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Download sample file
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeImportModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={!selectedFile}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Review import
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3" aria-label="Import progress">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-primary-content">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                File
              </span>
              <span className="h-px flex-1 bg-primary/30" aria-hidden="true" />
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-content">
                  2
                </span>
                Review
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selectedFile?.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Columns found: Name, Category, Price, Product code
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                5 rows detected
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-2xl font-semibold tracking-tight text-emerald-800">4</p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-700">Ready to import</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-2xl font-semibold tracking-tight text-amber-800">1</p>
                <p className="mt-0.5 text-xs font-semibold text-amber-700">Needs attention</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-2xl font-semibold tracking-tight text-slate-800">4</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">Columns matched</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Product manifest</p>
                  <p className="mt-0.5 text-xs text-slate-500">A preview of the first 5 rows in your file</p>
                </div>
                <span className="text-xs font-medium text-slate-500">Mock preview</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-white text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-inherit">Row</th>
                      <th className="px-4 py-3 font-inherit">Product</th>
                      <th className="px-4 py-3 font-inherit">Category</th>
                      <th className="px-4 py-3 font-inherit">Price</th>
                      <th className="px-4 py-3 font-inherit">Code</th>
                      <th className="px-4 py-3 font-inherit">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewProducts.map((product) => (
                      <tr key={product.row} className={product.issue ? "bg-amber-50/50" : "bg-white"}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.row}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{product.name}</td>
                        <td className="px-4 py-3 text-slate-600">{product.category}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{product.price}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.code}</td>
                        <td className="px-4 py-3">
                          {product.issue ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              {product.issue}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
              One row is missing a price and will be skipped. Update the CSV and go back if you want to include it.
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setImportStep("upload")}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Change file
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
              >
                Import 4 products
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={productToDelete !== null}
        title="Delete product?"
        description="This will permanently remove the product from your catalog. This action cannot be undone."
        onClose={closeDeleteModal}
        size="sm"
      >
        {productToDelete ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {productToDelete.image ? (
                <img
                  src={productToDelete.image}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                  <Package className="h-5 w-5" aria-label="No product image" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {productToDelete.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {productToDelete.id} · {productToDelete.category}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-950">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-rose-900">
                You will no longer be able to manage this product from the catalog.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                Delete product
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardTableContent>
  );
}
