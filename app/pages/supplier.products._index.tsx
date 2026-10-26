import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
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
import { useTranslation } from "~/shared/lib/i18n";
import {
  deleteSupplierProduct,
  getLoggedInUser,
  getSupplierCategories,
  getSupplierProducts,
  saveSupplierProduct,
  type StoredSupplierProduct,
  type SupplierProductStatus,
} from "~/shared/lib/indexed-db";
import {
  analyzeProductsExcel,
  importProductsExcel,
  confirmProductsImport,
  type ProductImportPreviewDto,
  type ExcelColumnInfoDto,
  type ExcelColumnMappingDto,
} from "~/shared/api/products";

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

export default function SupplierProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);

  const columns: TableColumn<SupplierProduct>[] = [
    {
      id: "product",
      header: t("cart.item"),
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
    { id: "category", header: t("products.category"), cell: (product) => product.category },
    {
      id: "selling-options",
      header: t("products.packaging"),
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
      header: "SKU",
      cell: (product) => product.code ?? "—",
    },
    {
      id: "status",
      header: t("common.status"),
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
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [createdDate, setCreatedDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [availableColumns, setAvailableColumns] = useState<ExcelColumnInfoDto[]>([]);
  const [columnMapping, setColumnMapping] = useState<ExcelColumnMappingDto>({});
  const [totalFileRows, setTotalFileRows] = useState(0);
  const [importPreviewData, setImportPreviewData] = useState<ProductImportPreviewDto[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessageVisible, setImportMessageVisible] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState<CatalogNotice | null>(null);
  const [productToDelete, setProductToDelete] = useState<SupplierProduct | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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
      const currentAccountId = user?.id || "supplier";
      if (!isCurrent) return;
      setAccountId(currentAccountId);
      setUserRole(user?.userRole ?? null);

      try {
        const [storedProducts, categories] = await Promise.all([
          getSupplierProducts(currentAccountId),
          getSupplierCategories(currentAccountId),
        ]);
        if (!isCurrent) return;

        const categoriesById = new Map(categories.map((category) => [category.id, category.name]));
        setProducts(
          storedProducts.map((product) => ({
            id: product.id,
            name: product.name,
            category: (product.categoryIds || []).map((id) => categoriesById.get(id)).filter(Boolean).join(", ") || "Uncategorized",
            createdAt: product.createdAt || "",
            price: (product.sellingOptions && product.sellingOptions[0]?.price) ?? 0,
            sellingOptions: (product.sellingOptions || []).map((option) => ({
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
      } catch (err) {
        console.error("Failed to load supplier products:", err);
        if (isCurrent) {
          setCatalogNotice({ title: t("products.productsUnavailable"), description: t("products.productsUnavailable") });
        }
      }
    })();

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
  }, [filteredProducts.length, page, pageSize]);

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
    setAvailableColumns([]);
    setColumnMapping({});
    setTotalFileRows(0);
    setImportPreviewData([]);
    setImportError(null);
    setImportStep("upload");
  }

  async function handleAnalyzeFile() {
    if (!selectedFile) return;
    setIsImportLoading(true);
    setImportError(null);
    try {
      const analysis = await analyzeProductsExcel(selectedFile);
      if (!analysis.availableColumns || analysis.availableColumns.length === 0) {
        setImportError(t("products.importNoDataError"));
        return;
      }
      setAvailableColumns(analysis.availableColumns);
      setColumnMapping(analysis.suggestedMapping || {});
      setTotalFileRows(analysis.totalDataRows || 0);
      setImportPreviewData(analysis.initialPreview || []);
      setImportStep("mapping");
    } catch (err: any) {
      console.error("Import analyze error:", err);
      setImportError(err.message || t("products.importFileFormatError"));
    } finally {
      setIsImportLoading(false);
    }
  }

  async function handleApplyMapping() {
    if (!selectedFile) return;
    if (!columnMapping.nameColumn || !columnMapping.priceColumn) {
      setImportError(t("products.importRequiredFieldsError"));
      return;
    }
    setIsImportLoading(true);
    setImportError(null);
    try {
      const preview = await importProductsExcel(selectedFile, columnMapping);
      if (!preview || preview.length === 0) {
        setImportError(t("products.importMappingFailedError"));
        return;
      }
      setImportPreviewData(preview);
      setImportStep("preview");
    } catch (err: any) {
      console.error("Import mapping preview error:", err);
      setImportError(err.message || t("products.importProcessError"));
    } finally {
      setIsImportLoading(false);
    }
  }

  async function handleStartImport() {
    const validItems = importPreviewData.filter((p) => p.isValid);
    if (validItems.length === 0) return;
    setIsImportLoading(true);
    setImportError(null);
    try {
      await confirmProductsImport(validItems);
      if (accountId) {
        const [storedProducts, categories] = await Promise.all([
          getSupplierProducts(accountId),
          getSupplierCategories(accountId),
        ]);
        const categoriesById = new Map(categories.map((c) => [c.id, c.name]));
        setProducts(
          storedProducts.map((product) => ({
            id: product.id,
            name: product.name,
            category: (product.categoryIds || []).map((id) => categoriesById.get(id)).filter(Boolean).join(", ") || "Uncategorized",
            createdAt: product.createdAt || "",
            price: (product.sellingOptions && product.sellingOptions[0]?.price) ?? 0,
            sellingOptions: (product.sellingOptions || []).map((option) => ({
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
      }
      setImportMessageVisible(true);
      closeImportModal();
    } catch (err: any) {
      console.error("Confirm import error:", err);
      setImportError(err.message || t("products.importConfirmError"));
    } finally {
      setIsImportLoading(false);
    }
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
        title: t("products.statusNotSaved"),
        description: t("products.statusNotSavedDesc"),
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
        title: t("products.productDeleted"),
        description: `${productToDelete.name} has been removed from your catalog.`,
      });
      closeDeleteModal();
    } catch {
      setCatalogNotice({
        title: t("products.productDeleteError"),
        description: t("products.productDeleteErrorDesc"),
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
        title={t("nav.products")}
        icon={<Package className="h-5 w-5" aria-hidden="true" />}
        primaryAction={
          <button
            type="button"
            onClick={() => navigate("/supplier/products/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.addProduct")}
          </button>
        }
        secondaryActions={
          userRole !== "SalesManager" ? (
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
          ) : undefined
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
                    <p className="text-sm font-semibold">{t("products.importStarted")}</p>
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
        searchPlaceholder={t("products.searchPlaceholder")}
        searchFilters={supplierProductSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        dateFilterValue={createdDate}
        onDateFilterChange={handleCreatedDateChange}
        dateFilterLabel={t("products.createdDate")}
        columns={columns}
        rows={visibleProducts}
        getRowKey={(product) => product.id}
        rowLink={(product) => `/supplier/products/${product.id}`}
        rowActions={[
          {
            label: (product) =>
              product.status === "Active" ? t("products.unlist") : t("products.listProduct"),
            icon: <Power aria-hidden="true" />,
            onClick: handleToggleProductStatus,
          },
          ...(userRole !== "SalesManager"
            ? [
                {
                  label: t("common.delete"),
                  icon: <Trash2 aria-hidden="true" />,
                  variant: "danger" as const,
                  onClick: setProductToDelete,
                },
              ]
            : []),
        ]}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        totalCount={filteredProducts.length}
        emptyMessage={t("common.noResults")}
      />

      <Modal
        isOpen={isImportModalOpen}
        title={
          importStep === "upload"
            ? t("products.importExcelTitle")
            : importStep === "mapping"
            ? t("products.importMappingTitle")
            : t("products.importPreviewTitle")
        }
        description={
          importStep === "upload"
            ? t("products.importUploadDesc")
            : importStep === "mapping"
            ? t("products.importMappingDesc")
            : t("products.importPreviewDesc")
        }
        onClose={closeImportModal}
        size={importStep === "upload" ? "sm" : "xl"}
      >
        {importStep === "upload" ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2" aria-label="Import progress">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-content font-bold">
                  1
                </span>
                {t("products.stepFile")}
              </span>
              <span className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 text-[11px] font-bold">
                  2
                </span>
                {t("products.stepColumns")}
              </span>
              <span className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 text-[11px] font-bold">
                  3
                </span>
                {t("products.stepPreview")}
              </span>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <Upload className="h-7 w-7 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">
                {selectedFile ? selectedFile.name : t("products.selectExcelFile")}
              </span>
              <span className="text-xs text-slate-500">
                {t("products.excelFileLimit")}
              </span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setImportError(null);
                  setImportStep("upload");
                }}
              />
            </label>

            {importError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Download className="h-4 w-4" aria-hidden="true" />
              <button
                type="button"
                onClick={handleDownloadSample}
                className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition hover:text-primary/80 hover:decoration-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t("products.downloadSample")}
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImportLoading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleAnalyzeFile}
                disabled={!selectedFile || isImportLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("products.verifyFile")}
              </button>
            </div>
          </div>
        ) : importStep === "mapping" ? (
          <div className="flex flex-col gap-5">
            {/* Stepper */}
            <div className="flex items-center gap-2" aria-label="Import progress">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                {t("products.stepFile")}
              </span>
              <span className="h-0.5 flex-1 bg-emerald-300" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-content font-bold">
                  2
                </span>
                {t("products.stepColumns")}
              </span>
              <span className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 text-[11px] font-bold">
                  3
                </span>
                {t("products.stepPreview")}
              </span>
            </div>

            {/* File Info Banner */}
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
                    {t("products.columnsAndRowsDetected", { columns: availableColumns.length, rows: totalFileRows })}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {t("products.headerRow", { row: columnMapping.headerRowNumber ?? 1 })}
              </span>
            </div>

            {/* Info notice */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-800">
              <p className="font-semibold text-blue-900">{t("products.mappingNoticeTitle")}</p>
              <p className="mt-0.5 text-blue-700">
                {t("products.mappingNoticeDesc")}
              </p>
            </div>

            {/* Column mapping selectors grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* 1. Name (Required) */}
              <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("products.productNameField")} <span className="text-rose-500">*</span>
                  </label>
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    {t("common.required")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{t("products.productNameFieldDesc")}</p>
                <select
                  value={columnMapping.nameColumn ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setColumnMapping((prev) => ({ ...prev, nameColumn: val }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("products.selectColumnPlaceholder")}</option>
                  {availableColumns.map((col) => (
                    <option key={col.index} value={col.index}>
                      [{col.letter}] {col.name} {col.sampleValue ? `(${col.sampleValue})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Price (Required) */}
              <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("products.unitPriceAmd")} <span className="text-rose-500">*</span>
                  </label>
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    {t("common.required")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{t("products.unitPriceDesc")}</p>
                <select
                  value={columnMapping.priceColumn ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setColumnMapping((prev) => ({ ...prev, priceColumn: val }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("products.selectColumnPlaceholder")}</option>
                  {availableColumns.map((col) => (
                    <option key={col.index} value={col.index}>
                      [{col.letter}] {col.name} {col.sampleValue ? `(${col.sampleValue})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Code (Optional) */}
              <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("products.skuCodeField")}
                  </label>
                  <span className="text-[10px] text-slate-400">{t("common.optional")}</span>
                </div>
                <p className="text-[11px] text-slate-500">{t("products.skuCodeDesc")}</p>
                <select
                  value={columnMapping.codeColumn ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setColumnMapping((prev) => ({ ...prev, codeColumn: val }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("products.dontSelectAutoCode")}</option>
                  {availableColumns.map((col) => (
                    <option key={col.index} value={col.index}>
                      [{col.letter}] {col.name} {col.sampleValue ? `(${col.sampleValue})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Category (Optional) */}
              <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("products.category")}
                  </label>
                  <span className="text-[10px] text-slate-400">{t("common.optional")}</span>
                </div>
                <p className="text-[11px] text-slate-500">{t("products.categoryFieldDesc")}</p>
                <select
                  value={columnMapping.categoryColumn ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setColumnMapping((prev) => ({ ...prev, categoryColumn: val }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("products.defaultNoCategory")}</option>
                  {availableColumns.map((col) => (
                    <option key={col.index} value={col.index}>
                      [{col.letter}] {col.name} {col.sampleValue ? `(${col.sampleValue})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Packaging (Optional) */}
              <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("products.packagingField")}
                  </label>
                  <span className="text-[10px] text-slate-400">{t("common.optional")}</span>
                </div>
                <p className="text-[11px] text-slate-500">{t("products.packagingFieldDesc")}</p>
                <select
                  value={columnMapping.packagingColumn ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setColumnMapping((prev) => ({ ...prev, packagingColumn: val }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("products.dontSelect")}</option>
                  {availableColumns.map((col) => (
                    <option key={col.index} value={col.index}>
                      [{col.letter}] {col.name} {col.sampleValue ? `(${col.sampleValue})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Unit (Optional) */}
              <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("products.unitField")}
                  </label>
                  <span className="text-[10px] text-slate-400">{t("common.optional")}</span>
                </div>
                <p className="text-[11px] text-slate-500">{t("products.unitFieldDesc")}</p>
                <select
                  value={columnMapping.unitColumn ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setColumnMapping((prev) => ({ ...prev, unitColumn: val }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t("products.defaultUnitPiece")}</option>
                  {availableColumns.map((col) => (
                    <option key={col.index} value={col.index}>
                      [{col.letter}] {col.name} {col.sampleValue ? `(${col.sampleValue})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Sample Preview */}
            {importPreviewData.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {t("products.quickSampleTitle")}
                  </span>
                  <span className="text-xs text-slate-500">
                    {t("products.totalProductsCount", { count: importPreviewData.length })}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {importPreviewData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs border border-slate-100 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">#{item.rowNumber}</span>
                        <span className="font-semibold text-slate-900">{item.name || t("products.noName")}</span>
                        {item.code && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-mono text-[10px]">{item.code}</span>}
                        {item.categoryName && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 text-[10px]">{item.categoryName}</span>}
                        {item.packaging && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 text-[10px]">{item.packaging}</span>}
                      </div>
                      <div className="font-bold text-emerald-700">
                        {formatAmd(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setImportStep("upload")}
                disabled={isImportLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("products.chooseAnotherFile")}
              </button>
              <button
                type="button"
                onClick={handleApplyMapping}
                disabled={isImportLoading || !columnMapping.nameColumn || !columnMapping.priceColumn}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("products.showPreview")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Stepper */}
            <div className="flex items-center gap-2" aria-label="Import progress">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                {t("products.stepFile")}
              </span>
              <span className="h-0.5 flex-1 bg-emerald-300" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                {t("products.stepColumns")}
              </span>
              <span className="h-0.5 flex-1 bg-primary/30" aria-hidden="true" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-content font-bold">
                  3
                </span>
                {t("products.stepPreview")}
              </span>
            </div>

            {/* File info banner with change columns button */}
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
                    [{availableColumns.find((c) => c.index === columnMapping.nameColumn)?.letter}] {availableColumns.find((c) => c.index === columnMapping.nameColumn)?.name || "—"} • 
                    [{availableColumns.find((c) => c.index === columnMapping.priceColumn)?.letter}] {availableColumns.find((c) => c.index === columnMapping.priceColumn)?.name || "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportStep("mapping")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("products.changeColumns")}
              </button>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-2xl font-semibold tracking-tight text-emerald-800">
                  {importPreviewData.filter((x) => x.isValid).length}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-700">{t("products.readyToImport")}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-2xl font-semibold tracking-tight text-amber-800">
                  {importPreviewData.filter((x) => !x.isValid).length}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-amber-700">{t("products.needsAttention")}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-2xl font-semibold tracking-tight text-slate-800">
                  {importPreviewData.length}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">{t("products.totalDetected")}</p>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-inherit">{t("products.tableRow")}</th>
                    <th className="px-4 py-3 font-inherit">{t("common.product")}</th>
                    <th className="px-4 py-3 font-inherit">{t("products.tableCategory")}</th>
                    <th className="px-4 py-3 font-inherit">{t("common.price")}</th>
                    <th className="px-4 py-3 font-inherit">{t("products.tableCode")}</th>
                    <th className="px-4 py-3 font-inherit">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreviewData.map((product) => {
                    const hasIssues = !product.isValid;
                    return (
                      <tr key={product.rowNumber} className={hasIssues ? "bg-amber-50/50" : "bg-white"}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.rowNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{product.name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{product.categoryName || t("products.noCategory")}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{formatAmd(product.price)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.code || "—"}</td>
                        <td className="px-4 py-3">
                          {hasIssues ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              {product.validationErrors?.join(", ") || t("common.error")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("products.ready")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {importError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {importPreviewData.some((x) => !x.isValid) && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                {t("products.errorRowsNotice", { count: importPreviewData.filter((x) => x.isValid).length })}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setImportStep("mapping")}
                disabled={isImportLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("products.backToColumns")}
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={isImportLoading || importPreviewData.filter((x) => x.isValid).length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("products.importCountProducts", { count: importPreviewData.filter((x) => x.isValid).length })}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={productToDelete !== null}
        title={t("products.deleteProductModalTitle")}
        description={t("products.deleteProductModalDesc")}
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
                {t("products.deleteProductModalWarning")}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                {t("products.deleteConfirm")}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardTableContent>
  );
}
