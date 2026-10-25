import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Package,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useCallback, useEffect, useState } from "react";
import Input from "~/shared/ui/form/input";
import Select from "~/shared/ui/form/select";
import { DashboardHeaderActions, DashboardPageContent } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";
import {
  IndividualPricesSection,
  type IndividualPrice,
} from "~/features/individual-prices";
import {
  createSupplierCategory,
  createSupplierProductId,
  getHorecaUsers,
  getLoggedInUser,
  getSupplierCategories,
  getSupplierProduct,
  getSupplierProfile,
  saveSupplierProduct,
  saveSupplierProfile,
  type LoggedInUser,
  type StoredSupplierCategory,
  type SupplierProductStatus,
} from "~/shared/lib/indexed-db";

const packageUnitTypes = [
  "Piece (հատ)",
  "Kilogram (կգ)",
  "Gram (գ)",
  "Liter (լ)",
  "Milliliter (մլ)",
  "Package",
  "Custom selling unit",
] as const;
type PackageUnitType = (typeof packageUnitTypes)[number];

type SellingOptionDraft = {
  id: string;
  quantity: string;
  unitType: PackageUnitType;
  /** Individual pieces contained in one package; only applies to Package units. */
  piecesPerPackage: string;
  customUnit: string;
  price: string;
  compareAtPrice: string;
  minimumOrderQuantity: string;
  companyPrices: IndividualPrice[];
};

function formatAmd(value: number) {
  return new Intl.NumberFormat("hy-AM", {
    style: "currency",
    currency: "AMD",
    maximumFractionDigits: 0,
  }).format(value);
}

function isPositiveWholeNumber(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function createSellingOption(id: string): SellingOptionDraft {
  return {
    id,
    quantity: "",
    unitType: "Piece (հատ)",
    piecesPerPackage: "",
    customUnit: "",
    price: "",
    compareAtPrice: "",
    minimumOrderQuantity: "1",
    companyPrices: [],
  };
}

export default function SupplierProductDetailPage() {
  const { t } = useTranslation();
  const { productId } = useParams();
  const navigate = useNavigate();
  const isNewProduct = productId === "new";
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<StoredSupplierCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<SupplierProductStatus>("Active");
  const [sellingOptions, setSellingOptions] = useState<SellingOptionDraft[]>([
    createSellingOption("option-1"),
  ]);
  const [sellingOptionsError, setSellingOptionsError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [horecaCustomers, setHorecaCustomers] = useState<LoggedInUser[]>([]);
  const [isLoadingHorecaCustomers, setIsLoadingHorecaCustomers] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      const currentAccountId = user?.id || "supplier";
      if (!isCurrent) return;
      setAccountId(currentAccountId);
      setUserRole(user?.userRole ?? null);

      try {
        const [categories, profile, product] = await Promise.all([
          getSupplierCategories(currentAccountId),
          getSupplierProfile(currentAccountId),
          isNewProduct || !productId ? Promise.resolve(null) : getSupplierProduct(currentAccountId, productId),
        ]);
        if (!isCurrent) return;

        setCategoryOptions(
          categories.sort((first, second) => first.name.localeCompare(second.name)),
        );
        setCategoriesError(null);
        if (!isNewProduct && !product) {
          setProductError("This product couldn't be found in your catalog.");
        } else if (product) {
          setTitle(product.name);
          setDescription(product.description);
          setCode(product.code ?? "");
          setCategoryIds(product.categoryIds || []);
          setStatus(product.status);
          setImagePreviewUrl(product.imageUrl ?? null);
          setCreatedAt(product.createdAt);
          setSellingOptions(
            product.sellingOptions.map((option) => ({
              id: option.id,
              quantity: String(option.quantity),
              unitType: option.unitType as PackageUnitType,
              piecesPerPackage: option.piecesPerPackage ? String(option.piecesPerPackage) : "",
              customUnit: option.customUnit ?? "",
              price: String(option.price),
              compareAtPrice: option.compareAtPrice ? String(option.compareAtPrice) : "",
              minimumOrderQuantity: String(option.minimumOrderQuantity),
              companyPrices: option.companyPrices,
            })),
          );
        }
      } catch {
        if (!isCurrent) return;
        setCategoriesError("We couldn't load your supplier categories.");
      } finally {
        if (isCurrent) {
          setIsLoadingCategories(false);
        }
      }

      try {
        const customers = await getHorecaUsers();
        if (isCurrent) {
          setHorecaCustomers(customers);
        }
      } catch {
        // ignore
      } finally {
        if (isCurrent) {
          setIsLoadingHorecaCustomers(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [isNewProduct, productId]);

  async function handleCategoryChange(nextValue: string | string[]) {
    const targetAccountId = accountId || "supplier";

    const nextValues = Array.isArray(nextValue) ? nextValue : [nextValue];
    try {
      const categoryIdsToSave = await Promise.all(
        nextValues.map(async (value) => {
          if (categoryOptions.some((category) => category.id === value)) return value;

          const category = await createSupplierCategory(targetAccountId, value);
          setCategoryOptions((currentCategories) =>
            currentCategories.some((current) => current.id === category.id)
              ? currentCategories
              : [...currentCategories, category].sort((first, second) =>
                  first.name.localeCompare(second.name),
                ),
          );
          return category.id;
        }),
      );
      const nextCategoryIds = [...new Set(categoryIdsToSave)];
      setCategoryIds(nextCategoryIds);
      const profile = await getSupplierProfile(targetAccountId);
      await saveSupplierProfile({
        ...profile,
        categoryIds: [...new Set([...profile.categoryIds, ...nextCategoryIds])],
      });
      setCategoriesError(null);
    } catch (cause) {
      setCategoriesError(
        cause instanceof Error ? cause.message : "Couldn't add that category.",
      );
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImagePreviewUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreviewUrl(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetAccountId = accountId || "supplier";
    if (!title.trim()) return;

    const hasInvalidOption = sellingOptions.some(
      (option) =>
        Number(option.quantity) <= 0 ||
        Number(option.price) < 0 ||
        (Boolean(option.compareAtPrice) && Number(option.compareAtPrice) <= Number(option.price)) ||
        Number(option.minimumOrderQuantity) <= 0 ||
        (option.unitType === "Package" && !isPositiveWholeNumber(option.piecesPerPackage)) ||
        (option.unitType === "Custom selling unit" && !option.customUnit.trim()),
    );
    if (sellingOptions.length === 0 || hasInvalidOption) {
      setSellingOptionsError(
        "Each selling option needs a quantity, unit, price, and minimum order. Package units also need a positive whole number of pieces per package. A compare-at price must be higher than the selling price.",
      );
      return;
    }

    setSellingOptionsError(null);
    setIsSaving(true);
    try {
      await saveSupplierProduct({
        id: isNewProduct ? createSupplierProductId() : productId ?? createSupplierProductId(),
        accountId: targetAccountId,
        name: title.trim(),
        description: description.trim(),
        categoryIds,
        code: code.trim() || undefined,
        imageUrl: imagePreviewUrl ?? undefined,
        status,
        createdAt: createdAt ?? new Date().toISOString().slice(0, 10),
        sellingOptions: sellingOptions.map((option) => ({
          id: option.id,
          quantity: Number(option.quantity),
          unitType: option.unitType,
          piecesPerPackage: option.unitType === "Package" ? Number(option.piecesPerPackage) : undefined,
          customUnit: option.unitType === "Custom selling unit" ? option.customUnit.trim() : undefined,
          price: Number(option.price),
          compareAtPrice: option.compareAtPrice ? Number(option.compareAtPrice) : undefined,
          minimumOrderQuantity: Number(option.minimumOrderQuantity),
          companyPrices: option.companyPrices,
        })),
      });
      navigate("/supplier/products");
    } catch {
      setProductError("We couldn't save this product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateSellingOption(id: string, patch: Partial<SellingOptionDraft>) {
    setSellingOptions((currentOptions) =>
      currentOptions.map((option) =>
        option.id === id ? { ...option, ...patch } : option,
      ),
    );
    setSellingOptionsError(null);
  }

  function addSellingOption() {
    setSellingOptions((currentOptions) => [
      ...currentOptions,
      createSellingOption(`option-${Date.now()}`),
    ]);
  }

  const updateOptionCompanyPrices = useCallback(
    (optionId: string, companyPrices: IndividualPrice[]) => {
      setSellingOptions((currentOptions) =>
        currentOptions.map((option) =>
          option.id === optionId ? { ...option, companyPrices } : option,
        ),
      );
    },
    [],
  );

  return (
    <DashboardPageContent>
      <DashboardHeaderActions
        back={
          <Link
            to="/supplier/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("products.backToProducts")}
          </Link>
        }
        actions={
          <>
            <Link
              to="/supplier/products"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              form="product-editor"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? t("products.savingProduct") : isNewProduct ? t("dashboard.addProduct") : t("products.saveProduct")}
            </button>
          </>
        }
      />
      <form id="product-editor" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Catalog / {isNewProduct ? t("dashboard.addProduct") : t("products.saveProduct")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {isNewProduct ? t("dashboard.addProduct") : title || t("dashboard.addProduct")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Keep the details clear so buyers can find and order the right item.
          </p>
          {productError ? <p role="alert" className="mt-3 text-sm text-red-700">{productError}</p> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-7">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("products.generalInfo")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t("dashboard.addProductDesc")}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="product-category"
                    className="mb-2 block text-sm font-medium text-slate-900"
                  >
                    {t("products.category")}
                  </label>
                  <Select
                    id="product-category"
                    multiple
                    creatable
                    createLabel={(value) => `Add “${value}”`}
                    value={categoryIds}
                    onValueChange={handleCategoryChange}
                    disabled={isLoadingCategories}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                  {categoriesError ? (
                    <p className="mt-2 text-sm text-red-700">{categoriesError}</p>
                  ) : isLoadingCategories ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Loading your supplier categories...
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      {t("products.productCategoriesDesc")}
                    </p>
                  )}
                </div>

                <Input
                  id="product-title"
                  label={t("products.productTitle")}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Organic Citrus Mix"
                  required
                />

                <Input
                  id="product-code"
                  label={t("products.skuCode")}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="e.g. OCM-204"
                />

                <div>
                  <label
                    htmlFor="product-description"
                    className="mb-2 block text-sm font-medium text-slate-900"
                  >
                    {t("products.productDescription")}
                  </label>
                  <textarea
                    id="product-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe what makes this product useful to buyers."
                    rows={6}
                    className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-200 hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t("products.sellingOptions")}</h2>
                  <p className="mt-1 text-sm text-slate-500">Offer the same product by piece, pack, box, or a unit your business uses.</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Package className="h-4 w-4" aria-hidden="true" /></span>
              </div>

              <div className="space-y-3">
                {sellingOptions.map((option, index) => (
                  <div key={option.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{t("products.sellingOptionTitle", { number: index + 1 })}</p>
                      <button type="button" onClick={() => setSellingOptions((currentOptions) => currentOptions.filter((currentOption) => currentOption.id !== option.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={t("products.removeSellingOption", { number: index + 1 })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[0.65fr_1.2fr_0.85fr_0.85fr_0.85fr]">
                      <Input id={`option-${option.id}-quantity`} label={t("common.quantity")} type="number" min="1" step="1" value={option.quantity} onChange={(event) => updateSellingOption(option.id, { quantity: event.target.value })} placeholder="1" required />
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor={`option-${option.id}-unit`}>{t("products.unitType")}</label>
                        <Select id={`option-${option.id}-unit`} value={option.unitType} onValueChange={(value) => updateSellingOption(option.id, { unitType: (Array.isArray(value) ? value[0] : value) as PackageUnitType })}>
                          {packageUnitTypes.map((unitType) => (
                            <option key={unitType} value={unitType}>
                              {unitType === "Piece (հատ)" ? t("products.unitPiece") :
                               unitType === "Kilogram (կգ)" ? t("products.unitKilogram") :
                               unitType === "Gram (գ)" ? t("products.unitGram") :
                               unitType === "Liter (լ)" ? t("products.unitLiter") :
                               unitType === "Milliliter (մլ)" ? t("products.unitMilliliter") :
                               unitType === "Package" ? t("products.unitPackage") :
                               unitType === "Custom selling unit" ? t("products.unitCustom") : unitType}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Input id={`option-${option.id}-price`} label={`${t("common.price")} (AMD)`} type="number" min="0" step="1" value={option.price} onChange={(event) => updateSellingOption(option.id, { price: event.target.value })} placeholder="0" required disabled={userRole === "SalesManager"} />
                      <Input id={`option-${option.id}-compare-at-price`} label={t("products.compareAtPrice")} type="number" min="0" step="1" value={option.compareAtPrice} onChange={(event) => updateSellingOption(option.id, { compareAtPrice: event.target.value })} placeholder="Optional" disabled={userRole === "SalesManager"} />
                      <Input id={`option-${option.id}-minimum-order`} label={t("products.minOrderQuantity")} type="number" min="1" step="1" value={option.minimumOrderQuantity} onChange={(event) => updateSellingOption(option.id, { minimumOrderQuantity: event.target.value })} placeholder="1" required />
                    </div>
                    {option.unitType === "Package" ? <Input id={`option-${option.id}-pieces-per-package`} label={t("products.piecesPerPackage")} type="number" min="1" step="1" inputMode="numeric" value={option.piecesPerPackage} onChange={(event) => updateSellingOption(option.id, { piecesPerPackage: event.target.value })} placeholder="e.g. 12" required error={Boolean(option.piecesPerPackage) && !isPositiveWholeNumber(option.piecesPerPackage)} errorMessage={Boolean(option.piecesPerPackage) && !isPositiveWholeNumber(option.piecesPerPackage) ? "Enter a positive whole number." : undefined} containerClassName="mt-3" /> : null}
                    {option.unitType === "Custom selling unit" ? <Input id={`option-${option.id}-custom-unit`} label={t("products.customUnitName")} value={option.customUnit} onChange={(event) => updateSellingOption(option.id, { customUnit: event.target.value })} placeholder="e.g. 20 L keg or service tray" containerClassName="mt-3" required /> : null}
                    <p className="mt-3 text-xs text-slate-500">{t("products.buyersSee")}{" "}<span className="font-semibold text-slate-700">{option.quantity || "—"} {option.unitType === "Custom selling unit" ? option.customUnit || "custom unit" : option.unitType}{option.unitType === "Package" && option.piecesPerPackage ? ` (${option.piecesPerPackage} pcs)` : ""}</span>{option.price ? ` — ${formatAmd(Number(option.price))}` : ""}{option.compareAtPrice ? <><span className="mx-1.5 text-slate-400">was</span><span className="text-slate-400 line-through">{formatAmd(Number(option.compareAtPrice))}</span></> : null}<span className="ml-2">{t("products.minOrder")}: {option.minimumOrderQuantity || "—"} {t("common.units")}</span></p>
                    {userRole !== "SalesManager" && (
                      isLoadingHorecaCustomers ? (
                        <p className="mt-4 text-sm text-slate-500">Loading HORECA customers...</p>
                      ) : (
                        <IndividualPricesSection
                          resourceLabel="Company"
                          resourceLabelPlural="companies"
                          title={t("products.companyPricesForOption")}
                          description={t("products.companyPricesForOptionDesc")}
                          variant="embedded"
                          idPrefix={`selling-option-${option.id}-company-price`}
                          resources={horecaCustomers.map((customer) => ({
                            id: customer.id,
                            label: customer.companyName,
                            description: "HORECA",
                            originalPrice: Number(option.price) || 0,
                            imageUrl: "",
                          }))}
                          initialPrices={option.companyPrices}
                          resetKey={`${productId ?? ""}-${option.id}-${isNewProduct}`}
                          formatPrice={formatAmd}
                          showOriginalPriceInResourceSelection={false}
                          onPricesChange={(companyPrices) => updateOptionCompanyPrices(option.id, companyPrices)}
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
              {sellingOptionsError ? <p role="alert" className="mt-3 text-sm text-red-700">{sellingOptionsError}</p> : null}
              <button type="button" onClick={addSellingOption} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"><Plus className="h-4 w-4" aria-hidden="true" />{t("products.addSellingOption")}</button>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t("products.productMedia")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add one clear product image for buyers.
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              {imagePreviewUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={imagePreviewUrl}
                    alt="Product image preview"
                    className="aspect-4/3 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-700 shadow-sm transition hover:bg-red-50"
                    aria-label="Remove product image"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center transition hover:border-primary/50 hover:bg-primary/5">
                  <ImagePlus
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {t("products.uploadProductImage")}
                  </span>
                  <span className="text-xs text-slate-500">
                    {t("products.productImageFormats")}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t("common.status")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Control whether buyers can see this product.
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <label
                htmlFor="product-status"
                className="mb-2 block text-sm font-medium text-slate-900"
              >
                {t("products.productStatus")}
              </label>
              <Select
                id="product-status"
                value={status}
                onValueChange={(value) =>
                  setStatus(
                    (typeof value === "string" ? value : value[0] ?? "Draft") as SupplierProductStatus,
                  )
                }
              >
                <option value="Active">{t("products.active")}</option>
                <option value="Draft">{t("products.draft")}</option>
                <option value="Unlisted">{t("products.unlisted")}</option>
                <option value="Inactive">{t("products.inactive")}</option>
              </Select>
            </section>

          </div>
        </div>
      </form>
    </DashboardPageContent>
  );
}
