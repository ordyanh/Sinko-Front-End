import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Gift, LayoutGrid, List, Minus, Package, Plus, Search, ShoppingBasket, Store, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router";
import {
  formatMarketplacePrice,
  getHorecaMarketplaceProducts,
  getMarketplaceMinimumOrderLabel,
  getMarketplaceOptionLabel,
  getMarketplaceSellingOptions,
  type MarketplaceCartLine,
  type MarketplaceProduct,
  type MarketplaceSellingOption,
} from "~/entities/product";
import { getPromotionProductIds, getPromotionalPrice, getPromotionsForProduct, promotionTypeLabels, type MarketplacePromotion } from "~/entities/promotion";
import {
  DashboardPageContent,
  Pagination,
  SearchFilter,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

function getDiscountDetails(originalPrice: number, discountedPrice: number) {
  const saving = originalPrice - discountedPrice;
  if (saving <= 0) return undefined;

  return {
    percentageLabel: `${Math.round((saving / originalPrice) * 100)}% off`,
    savingsLabel: `Save ${formatMarketplacePrice(saving)}`,
  };
}

function ProductCard({
  product,
  cartQuantity,
  onQuickAdd,
  onChangeQuantity,
  onOpenOptions,
}: {
  product: MarketplaceProduct;
  cartQuantity: number;
  onQuickAdd: () => void;
  onChangeQuantity: (nextQty: number) => void;
  onOpenOptions: () => void;
}) {
  const { t } = useTranslation();
  const availableOptions = getMarketplaceSellingOptions(product);
  const startingOption = availableOptions[0];
  const { price: productPrice, promotion: pricePromotion } = getPromotionalPrice(product, startingOption);
  const discount = pricePromotion ? getDiscountDetails(startingOption.price, productPrice) : undefined;
  const bxgyPromotion = getPromotionsForProduct(product.id).find(
    (promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === product.id && promotion.giftChoices?.length,
  ) ?? getPromotionsForProduct(product.id).find(
    (promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === product.id,
  );
  const hasMultipleOptions = availableOptions.length > 1;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
        <Link to={`/horeca/products/${product.id}`} className="block h-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary" aria-label={`View ${product.title}`}>
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              onError={(e) => {
                e.currentTarget.style.opacity = "0";
              }}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Package className="h-11 w-11" aria-hidden="true" />
            </div>
          )}
        </Link>
        <span className="absolute right-2.5 top-2.5 rounded-lg bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs backdrop-blur-xs">
          {product.category.split(",")[0]}
        </span>
        {pricePromotion ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-xs">
            {discount?.percentageLabel ?? pricePromotion.benefitLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">{product.supplier}</span>
        </div>
        <h2 className="mt-1 line-clamp-2 min-h-11 text-[15px] font-bold leading-5 tracking-tight text-slate-900">
          <Link to={`/horeca/products/${product.id}`} className="rounded-sm transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {product.title}
          </Link>
        </h2>
        <p className="mt-1 truncate text-xs text-slate-500" title={availableOptions.map(getMarketplaceOptionLabel).join(", ")}>
          {availableOptions.map(getMarketplaceOptionLabel).join(" · ")}
        </p>
        {pricePromotion ? <p className="mt-1.5 text-xs font-semibold text-rose-700">{discount?.savingsLabel ?? promotionTypeLabels[pricePromotion.type]}</p> : null}
        {bxgyPromotion ? (
          <Link to={`/horeca/products/${product.id}?promotion=${bxgyPromotion.id}`} className="mt-2.5 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-left transition hover:border-violet-200 hover:bg-violet-100/70">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-600 text-white"><Gift className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <span className="min-w-0"><span className="block truncate text-xs font-bold text-violet-950">{bxgyPromotion.benefitLabel}</span></span>
          </Link>
        ) : null}

        <div className="mt-auto border-t border-slate-100 pt-3 flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              {pricePromotion ? (
                <div className="text-[11px] text-slate-400">
                  <span className="whitespace-nowrap font-medium line-through tabular-nums">
                    {formatMarketplacePrice(startingOption.price)}
                  </span>
                </div>
              ) : null}
              <p className="whitespace-nowrap text-lg font-extrabold tracking-tight text-slate-950 tabular-nums">
                {formatMarketplacePrice(productPrice)}
              </p>
            </div>
            <p className="truncate text-right text-xs font-medium text-slate-500" title={getMarketplaceOptionLabel(startingOption)}>
              / {getMarketplaceOptionLabel(startingOption)}
            </p>
          </div>

          {cartQuantity > 0 && !hasMultipleOptions ? (
            <div className="flex h-10 w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangeQuantity(
                    cartQuantity <= startingOption.minimumOrderQuantity
                      ? 0
                      : cartQuantity - 1,
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary shadow-2xs transition hover:bg-primary hover:text-primary-content"
                aria-label={`Decrease ${product.title} quantity`}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {cartQuantity} {t("cart.inCart", "in cart")}
              </span>
              <button
                type="button"
                onClick={() => onChangeQuantity(cartQuantity + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-content shadow-2xs transition hover:brightness-95"
                aria-label={`Increase ${product.title} quantity`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={hasMultipleOptions ? onOpenOptions : onQuickAdd}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-content shadow-2xs transition hover:brightness-95 active:scale-[0.99]"
              >
                <ShoppingBasket className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {cartQuantity > 0
                    ? `${cartQuantity} ${t("cart.inCart", "in cart")}`
                    : t("products.addToCart")}
                </span>
              </button>
              {hasMultipleOptions ? (
                <button
                  type="button"
                  onClick={onOpenOptions}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  title={t("products.packaging", "Packaging options")}
                >
                  {availableOptions.length} opt.
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function HorecaProductsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const { cartLines, setCartLineQuantity, promotions, catalogProducts, promotionGiftProductIds, setPromotionGiftProductId } = useOutletContext<{
    cartLines: MarketplaceCartLine[];
    promotions: MarketplacePromotion[];
    catalogProducts?: MarketplaceProduct[];
    promotionGiftProductIds: Record<string, string>;
    setCartLineQuantity: (
      product: MarketplaceProduct,
      option: MarketplaceSellingOption,
      quantity: number,
    ) => void;
    setPromotionGiftProductId: (promotionId: string, productId: string) => void;
  }>();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [selectionQuantity, setSelectionQuantity] = useState(1);
  const supplierFromUrl = searchParams.get("supplier");
  const promotionFromUrl = searchParams.get("promotion");

  useEffect(() => {
    if (catalogProducts && catalogProducts.length > 0) {
      setProducts(catalogProducts);
      setIsLoadingProducts(false);
      return;
    }

    let isCurrent = true;
    void (async () => {
      const catalog = await getHorecaMarketplaceProducts();
      if (isCurrent) setProducts(catalog);
    })()
      .catch(() => {
        if (isCurrent) setProductsError("We couldn't load the supplier catalog. Please try again.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingProducts(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [catalogProducts]);

  useEffect(() => {
    setSelectedFilters(
      supplierFromUrl
        ? [
            {
              id: "supplier-from-directory",
              filterId: "supplier",
              operator: "is",
              value: supplierFromUrl,
            },
          ]
        : [],
    );
  }, [supplierFromUrl]);

  const selectedPromotion = promotions.find((promotion) => promotion.id === promotionFromUrl);

  const allCategoryPills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      for (const cat of product.category.split(", ").map((c) => c.trim()).filter(Boolean)) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
    return [
      { label: "All", count: products.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({ label, count })),
    ];
  }, [products]);

  const marketplaceSearchFilters = useMemo<SearchFilterDefinition[]>(
    () => [
      {
        id: "supplier",
        label: t("products.supplier"),
        options: Array.from(new Set(products.map((product) => product.supplier))).map((supplier) => ({ value: supplier, label: supplier })),
      },
      {
        id: "category",
        label: t("products.category"),
        options: Array.from(
          new Set(products.flatMap((product) => product.category.split(", "))),
        ).map((category) => ({ value: category, label: category })),
      },
    ],
    [products, t],
  );

  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = [product.title, product.supplier, product.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchValue);
        const matchesCategoryPill =
          selectedCategoryPill === "All" ||
          product.category
            .split(", ")
            .map((c) => c.trim())
            .includes(selectedCategoryPill);
        const matchesFilters = selectedFilters.every((filter) => {
          const doesMatch = filter.filterId === "supplier"
            ? product.supplier === filter.value
            : product.category.split(", ").includes(filter.value);

          return filter.operator === "is" ? doesMatch : !doesMatch;
        });

        return (
          matchesSearch &&
          matchesCategoryPill &&
          matchesFilters &&
          (!selectedPromotion || getPromotionProductIds(selectedPromotion).includes(product.id))
        );
      }),
    [normalizedSearchValue, products, selectedCategoryPill, selectedFilters, selectedPromotion],
  );

  useEffect(() => {
    setPage(1);
  }, [normalizedSearchValue, selectedCategoryPill, selectedFilters]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleProducts.slice(start, start + pageSize);
  }, [visibleProducts, page, pageSize]);

  const selectedOptions = selectedProduct ? getMarketplaceSellingOptions(selectedProduct) : [];
  const selectedOption = selectedOptions.find((option) => option.id === selectedOptionId) ?? selectedOptions[0];
  const selectedPricePromotion = selectedProduct && selectedOption ? getPromotionalPrice(selectedProduct, selectedOption).promotion : undefined;
  const selectedBxgyPromotion = selectedProduct ? getPromotionsForProduct(selectedProduct.id).find((promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === selectedProduct.id) : undefined;
  const activeQuickGiftPromotion = selectedBxgyPromotion?.triggerOptionId === selectedOption?.id
    ? selectedBxgyPromotion
    : undefined;
  const quickGiftChoices = activeQuickGiftPromotion?.giftChoices ?? [];
  const selectedQuickGiftProductId = activeQuickGiftPromotion
    ? promotionGiftProductIds[activeQuickGiftPromotion.id] ?? quickGiftChoices[0]?.productId
    : undefined;

  function openProductSelector(product: MarketplaceProduct) {
    const firstOption = getMarketplaceSellingOptions(product)[0];
    setSelectedProduct(product);
    setSelectedOptionId(firstOption.id);
    setSelectionQuantity(firstOption.minimumOrderQuantity);
  }

  function handleQuickAdd(product: MarketplaceProduct) {
    const firstOption = getMarketplaceSellingOptions(product)[0];
    if (!firstOption) return;
    const existingQty =
      cartLines.find(
        (line) => line.product.id === product.id && line.option.id === firstOption.id,
      )?.quantity ?? 0;
    const nextQty =
      existingQty === 0
        ? firstOption.minimumOrderQuantity
        : existingQty + 1;
    setCartLineQuantity(product, firstOption, nextQty);
  }

  function selectSellingOption(option: MarketplaceSellingOption) {
    setSelectedOptionId(option.id);
    setSelectionQuantity(option.minimumOrderQuantity);
  }

  function addSelectedOptionToCart() {
    if (!selectedProduct || !selectedOption) return;
    const qualifyingGiftPromotion = getPromotionsForProduct(selectedProduct.id).find(
      (promotion) => promotion.type === "BuyXGetY"
        && promotion.productIds[0] === selectedProduct.id
        && promotion.triggerOptionId === selectedOption.id
        && promotion.giftChoices?.length,
    );
    if (qualifyingGiftPromotion?.giftChoices?.[0]) {
      setPromotionGiftProductId(
        qualifyingGiftPromotion.id,
        promotionGiftProductIds[qualifyingGiftPromotion.id] ?? qualifyingGiftPromotion.giftChoices[0].productId,
      );
    }
    const currentQuantity = cartLines.find(
      (line) => line.product.id === selectedProduct.id && line.option.id === selectedOption.id,
    )?.quantity ?? 0;
    setCartLineQuantity(selectedProduct, selectedOption, currentQuantity + selectionQuantity);
    setSelectedProduct(null);
  }

  return (
    <DashboardPageContent>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {t("products.supplierMarketplace")}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t("products.stockKitchenSimply")}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                {selectedPromotion ? `${selectedPromotion.title}: ${selectedPromotion.benefitLabel}. ${selectedPromotion.conditions}` : t("products.browseIngredients")}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                    viewMode === "list"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <SearchFilter
              className="w-full"
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder={t("products.searchProductsSuppliersCategories")}
              filters={marketplaceSearchFilters}
              selectedFilters={selectedFilters}
              onSelectedFiltersChange={setSelectedFilters}
            />

            {allCategoryPills.length > 1 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                {allCategoryPills.map((cat) => {
                  const active = selectedCategoryPill === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategoryPill(cat.label)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-primary bg-primary text-primary-content shadow-2xs"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span>{cat.label === "All" ? t("common.all", "All") : cat.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                          active
                            ? "bg-white/20 text-primary-content"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-600">
              <span className="font-bold text-slate-900 tabular-nums">
                {visibleProducts.length}
              </span>{" "}
              {t("nav.products")}
            </p>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
              {t("products.todaysSelection")}
            </span>
          </div>

          {isLoadingProducts ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center text-sm font-medium text-slate-500">
              {t("products.loadingCatalog")}
            </div>
          ) : productsError ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-6 text-center">
              <h2 className="font-semibold text-rose-950">{t("products.catalogUnavailable")}</h2>
              <p className="mt-1 text-sm text-rose-700">{productsError}</p>
            </div>
          ) : visibleProducts.length > 0 ? (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pagedProducts.map((product) => {
                    const startingOption = getMarketplaceSellingOptions(product)[0];
                    const cartQuantity = cartLines
                      .filter((line) => line.product.id === product.id)
                      .reduce((total, line) => total + line.quantity, 0);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        cartQuantity={cartQuantity}
                        onQuickAdd={() => handleQuickAdd(product)}
                        onChangeQuantity={(nextQty) => {
                          if (startingOption) {
                            setCartLineQuantity(product, startingOption, nextQty);
                          }
                        }}
                        onOpenOptions={() => openProductSelector(product)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {pagedProducts.map((product) => {
                    const availableOptions = getMarketplaceSellingOptions(product);
                    const startingOption = availableOptions[0];
                    const { price: productPrice, promotion: pricePromotion } = getPromotionalPrice(product, startingOption);
                    const cartQuantity = cartLines
                      .filter((line) => line.product.id === product.id)
                      .reduce((total, line) => total + line.quantity, 0);
                    return (
                      <div
                        key={product.id}
                        className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <Link
                            to={`/horeca/products/${product.id}`}
                            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
                          >
                            {product.image ? (
                              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-slate-400">
                                <Package className="h-6 w-6" />
                              </span>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/horeca/products/${product.id}`}
                                className="truncate font-bold text-slate-900 hover:text-primary"
                              >
                                {product.title}
                              </Link>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                {product.category}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {product.supplier} · {availableOptions.map(getMarketplaceOptionLabel).join(" · ")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="text-right">
                            <p className="text-base font-extrabold text-slate-950 tabular-nums">
                              {formatMarketplacePrice(productPrice)}
                            </p>
                            {pricePromotion ? (
                              <p className="text-xs text-slate-400 line-through tabular-nums">
                                {formatMarketplacePrice(startingOption.price)}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">
                                / {getMarketplaceOptionLabel(startingOption)}
                              </p>
                            )}
                          </div>

                          {cartQuantity > 0 && availableOptions.length === 1 ? (
                            <div className="inline-flex h-9 items-center rounded-xl border border-primary/30 bg-primary/5 p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setCartLineQuantity(
                                    product,
                                    startingOption,
                                    cartQuantity <= startingOption.minimumOrderQuantity
                                      ? 0
                                      : cartQuantity - 1,
                                  )
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary shadow-2xs"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-9 px-2 text-center text-sm font-bold text-slate-900 tabular-nums">
                                {cartQuantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCartLineQuantity(product, startingOption, cartQuantity + 1)
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-content shadow-2xs"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                availableOptions.length > 1
                                  ? openProductSelector(product)
                                  : handleQuickAdd(product)
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-content shadow-2xs transition hover:brightness-95"
                            >
                              <ShoppingBasket className="h-3.5 w-3.5" />
                              <span>
                                {cartQuantity > 0
                                  ? `${cartQuantity} ${t("cart.inCart", "in cart")}`
                                  : t("products.addToCart")}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={visibleProducts.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[12, 24, 48, 96]}
                  itemName="products"
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <Search className="h-7 w-7 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-slate-900">{t("products.noProductsFound")}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("products.subtitle")}
              </p>
            </div>
          )}
        </div>
      </section>

      <Dialog open={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
              {selectedProduct && selectedOption ? (
                <>
                  <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
                    <div className="flex min-w-0 gap-4">
                      <img src={selectedProduct.image} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t("products.packaging")}</p>
                        <DialogTitle className="mt-1 text-xl font-bold tracking-tight text-slate-950">{selectedProduct.title}</DialogTitle>
                        <p className="mt-1 text-sm text-slate-500">{t("products.subtitle")}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedProduct(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Close product options"><X className="h-5 w-5" aria-hidden="true" /></button>
                  </div>
                  <div className="space-y-3 p-5 sm:p-6">
                    {selectedOptions.map((option) => {
                      const active = option.id === selectedOption.id;
                      const { price: optionPrice, promotion: pricePromotion } = getPromotionalPrice(selectedProduct, option);
                      return <button key={option.id} type="button" onClick={() => selectSellingOption(option)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-primary/40"}`}>
                        <span className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-primary text-primary-content" : "bg-slate-100 text-slate-500"}`}><Package className="h-4 w-4" aria-hidden="true" /></span><span><span className="block font-semibold text-slate-900">{getMarketplaceOptionLabel(option)}</span><span className="mt-0.5 block text-xs text-slate-500">{getMarketplaceMinimumOrderLabel(option)}</span></span></span>
                        <span className="text-right"><span className="block font-bold text-slate-950 tabular-nums">{formatMarketplacePrice(optionPrice)}</span>{pricePromotion ? <span className="mt-0.5 block text-xs text-slate-400 line-through tabular-nums">{formatMarketplacePrice(option.price)}</span> : null}</span>
                      </button>;
                    })}
                    {getPromotionsForProduct(selectedProduct.id).length > 0 ? <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-950">{selectedPricePromotion ? <p><span className="font-bold">{promotionTypeLabels[selectedPricePromotion.type]}:</span> {selectedPricePromotion.benefitLabel} {t("products.appliesToProduct")}</p> : null}{selectedBxgyPromotion ? <p className={selectedPricePromotion ? "mt-1" : ""}><span className="font-bold">{t("products.buyXGetY")}</span> {selectedBxgyPromotion.conditions}</p> : null}</div> : null}
                    {activeQuickGiftPromotion && quickGiftChoices.length > 0 ? <fieldset className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4"><legend className="px-1 text-sm font-bold text-violet-950">{t("promotions.activePromotions")}</legend><p className="mt-1 text-xs text-violet-700">{t("products.bxgyCartNote")}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{quickGiftChoices.map((choice) => { const giftProduct = products.find((product) => product.id === choice.productId); if (!giftProduct) return null; const active = choice.productId === selectedQuickGiftProductId; return <button key={choice.productId} type="button" onClick={() => setPromotionGiftProductId(activeQuickGiftPromotion.id, choice.productId)} className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${active ? "border-violet-500 bg-white ring-1 ring-violet-300" : "border-violet-100 bg-white/70 hover:border-violet-300"}`} aria-pressed={active}><img src={giftProduct.image} alt="" className="h-9 w-9 rounded-lg object-cover" /><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{giftProduct.title}</span><span className="block text-[11px] text-violet-700">{t("products.freeGift")}</span></span></button>; })}</div></fieldset> : null}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span><span className="block text-sm font-semibold text-slate-700">{t("products.quantity")}</span><span className="mt-0.5 block text-xs text-slate-500">{getMarketplaceMinimumOrderLabel(selectedOption)}</span></span>
                      <div className="flex h-10 items-center rounded-xl border border-primary/20 bg-white p-0.5"><button type="button" onClick={() => setSelectionQuantity((current) => Math.max(selectedOption.minimumOrderQuantity, current - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10" aria-label="Decrease selected unit quantity"><Minus className="h-4 w-4" aria-hidden="true" /></button><span className="w-9 text-center text-sm font-bold tabular-nums">{selectionQuantity}</span><button type="button" onClick={() => setSelectionQuantity((current) => current + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10" aria-label="Increase selected unit quantity"><Plus className="h-4 w-4" aria-hidden="true" /></button></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><span className="text-sm text-slate-600">{selectionQuantity} × {getMarketplaceOptionLabel(selectedOption)}</span><button type="button" onClick={addSelectedOptionToCart} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95">{t("products.addToCart")} ({formatMarketplacePrice(getPromotionalPrice(selectedProduct, selectedOption).price * selectionQuantity)})</button></div>
                </>
              ) : null}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </DashboardPageContent>
  );
}
