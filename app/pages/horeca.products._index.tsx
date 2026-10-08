import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Gift, Minus, Package, Plus, Search, ShoppingBasket, X } from "lucide-react";
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
  SearchFilter,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";

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
  selectedPackageCount,
  onOpen,
}: {
  product: MarketplaceProduct;
  selectedPackageCount: number;
  onOpen: () => void;
}) {
  const availableOptions = getMarketplaceSellingOptions(product);
  const startingOption = availableOptions[0];
  const { price: productPrice, promotion: pricePromotion } = getPromotionalPrice(product, startingOption);
  const discount = pricePromotion ? getDiscountDetails(startingOption.price, productPrice) : undefined;
  const bxgyPromotion = getPromotionsForProduct(product.id).find(
    (promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === product.id && promotion.giftChoices?.length,
  ) ?? getPromotionsForProduct(product.id).find(
    (promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === product.id,
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_3px_rgba(15,23,42,0.02)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.09)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#e9efe6]">
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
              <Package className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
        </Link>
        {pricePromotion ? (
          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white shadow-sm">
            {discount?.percentageLabel ?? pricePromotion.benefitLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-slate-500">{product.supplier}</p>
        <h2 className="mt-1 min-h-12 text-base font-semibold leading-6 tracking-tight text-slate-900">
          <Link to={`/horeca/products/${product.id}`} className="rounded-sm transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {product.title}
          </Link>
        </h2>
        <p className="mt-1 truncate text-xs text-slate-500" title={availableOptions.map(getMarketplaceOptionLabel).join(", ")}>
          {availableOptions.map(getMarketplaceOptionLabel).join(" · ")}
        </p>
        {pricePromotion ? <p className="mt-2 text-xs font-semibold text-rose-700">{discount?.savingsLabel ?? promotionTypeLabels[pricePromotion.type]} on this unit</p> : null}
        {bxgyPromotion ? (
          <Link to={`/horeca/products/${product.id}?promotion=${bxgyPromotion.id}`} className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-2.5 py-2 text-left transition hover:border-violet-200 hover:bg-violet-100/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-600 text-white"><Gift className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <span className="min-w-0"><span className="block text-xs font-bold text-violet-950">{bxgyPromotion.benefitLabel}</span><span className="block truncate text-[11px] font-medium text-violet-700">{bxgyPromotion.giftChoices?.length ? "Choose your free pantry item" : "Free item is added in cart"}</span></span>
          </Link>
        ) : null}

        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            {pricePromotion ? <div className="mb-0.5 text-xs text-slate-400"><span className="whitespace-nowrap font-medium line-through tabular-nums">{formatMarketplacePrice(startingOption.price)}</span></div> : null}
            <div className="flex items-baseline gap-1.5">
              <p className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-950 tabular-nums">
                {formatMarketplacePrice(productPrice)}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">From {getMarketplaceOptionLabel(startingOption)}</p>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-content shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
            {selectedPackageCount > 0 ? `${selectedPackageCount} in cart` : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HorecaProductsPage() {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
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
  const marketplaceSearchFilters = useMemo<SearchFilterDefinition[]>(
    () => [
      {
        id: "supplier",
        label: "Supplier",
        options: Array.from(new Set(products.map((product) => product.supplier))).map((supplier) => ({ value: supplier, label: supplier })),
      },
      {
        id: "category",
        label: "Category",
        options: Array.from(
          new Set(products.flatMap((product) => product.category.split(", "))),
        ).map((category) => ({ value: category, label: category })),
      },
    ],
    [products],
  );
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = [product.title, product.supplier, product.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchValue);
        const matchesFilters = selectedFilters.every((filter) => {
          const doesMatch = filter.filterId === "supplier"
            ? product.supplier === filter.value
            : product.category.split(", ").includes(filter.value);

          return filter.operator === "is" ? doesMatch : !doesMatch;
        });

        return matchesSearch && matchesFilters && (!selectedPromotion || getPromotionProductIds(selectedPromotion).includes(product.id));
      }),
    [normalizedSearchValue, products, selectedFilters, selectedPromotion],
  );
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
    // Quick-add honours the same rule as the product page. The buyer can
    // refine this default on the product page before completing the order.
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
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Supplier marketplace
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Stock the kitchen, simply.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                {selectedPromotion ? `${selectedPromotion.title}: ${selectedPromotion.benefitLabel}. ${selectedPromotion.conditions}` : "Browse ingredients and essentials from your trusted suppliers."}
              </p>
            </div>
          </div>

          <SearchFilter
            className="mt-7 max-w-2xl"
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder="Search products, suppliers, or categories"
            filters={marketplaceSearchFilters}
            selectedFilters={selectedFilters}
            onSelectedFiltersChange={setSelectedFilters}
          />
        </div>

        <div className="p-5 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-600">
              <span className="font-semibold text-slate-900 tabular-nums">
                {visibleProducts.length}
              </span>{" "}
              {visibleProducts.length === 1 ? "product" : "products"} available
            </p>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
              Today&apos;s selection
            </span>
          </div>

          {isLoadingProducts ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center text-sm font-medium text-slate-500">
              Loading supplier catalog…
            </div>
          ) : productsError ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-6 text-center">
              <h2 className="font-semibold text-rose-950">Catalog unavailable</h2>
              <p className="mt-1 text-sm text-rose-700">{productsError}</p>
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selectedPackageCount={cartLines
                    .filter((line) => line.product.id === product.id)
                    .reduce((total, line) => total + line.quantity, 0)}
                  onOpen={() => openProductSelector(product)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <Search className="h-7 w-7 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-slate-900">No products found</h2>
              <p className="mt-1 text-sm text-slate-500">
                Try a different product, supplier, or category name.
              </p>
            </div>
          )}
        </div>
      </section>

      <Dialog open={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
              {selectedProduct && selectedOption ? (
                <>
                  <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
                    <div className="flex min-w-0 gap-4">
                      <img src={selectedProduct.image} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Choose packaging</p>
                        <DialogTitle className="mt-1 text-xl font-bold tracking-tight text-slate-950">{selectedProduct.title}</DialogTitle>
                        <p className="mt-1 text-sm text-slate-500">Select the selling unit, then how many to order.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedProduct(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Close product options"><X className="h-5 w-5" aria-hidden="true" /></button>
                  </div>
                  <div className="space-y-3 p-5 sm:p-6">
                    {selectedOptions.map((option) => {
                      const active = option.id === selectedOption.id;
                      const { price: optionPrice, promotion: pricePromotion } = getPromotionalPrice(selectedProduct, option);
                      const bxgyPromotion = getPromotionsForProduct(selectedProduct.id).find((promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === selectedProduct.id);
                      return <button key={option.id} type="button" onClick={() => selectSellingOption(option)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-primary/40"}`}>
                        <span className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-primary text-primary-content" : "bg-slate-100 text-slate-500"}`}><Package className="h-4 w-4" aria-hidden="true" /></span><span><span className="block font-semibold text-slate-900">{getMarketplaceOptionLabel(option)}</span><span className="mt-0.5 block text-xs text-slate-500">{getMarketplaceMinimumOrderLabel(option)}</span></span></span>
                        <span className="text-right"><span className="block font-bold text-slate-950 tabular-nums">{formatMarketplacePrice(optionPrice)}</span>{pricePromotion ? <span className="mt-0.5 block text-xs text-slate-400 line-through tabular-nums">{formatMarketplacePrice(option.price)}</span> : null}</span>
                      </button>;
                    })}
                    {getPromotionsForProduct(selectedProduct.id).length > 0 ? <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-950">{selectedPricePromotion ? <p><span className="font-bold">{promotionTypeLabels[selectedPricePromotion.type]}:</span> {selectedPricePromotion.benefitLabel} applies to this product.</p> : null}{selectedBxgyPromotion ? <p className={selectedPricePromotion ? "mt-1" : ""}><span className="font-bold">Buy X, get Y:</span> {selectedBxgyPromotion.conditions}</p> : null}</div> : null}
                    {activeQuickGiftPromotion && quickGiftChoices.length > 0 ? <fieldset className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4"><legend className="px-1 text-sm font-bold text-violet-950">Choose your free gift</legend><p className="mt-1 text-xs text-violet-700">It is added separately once the required paid quantity is in your cart.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{quickGiftChoices.map((choice) => { const giftProduct = products.find((product) => product.id === choice.productId); if (!giftProduct) return null; const active = choice.productId === selectedQuickGiftProductId; return <button key={choice.productId} type="button" onClick={() => setPromotionGiftProductId(activeQuickGiftPromotion.id, choice.productId)} className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${active ? "border-violet-500 bg-white ring-1 ring-violet-300" : "border-violet-100 bg-white/70 hover:border-violet-300"}`} aria-pressed={active}><img src={giftProduct.image} alt="" className="h-9 w-9 rounded-lg object-cover" /><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{giftProduct.title}</span><span className="block text-[11px] text-violet-700">Free gift</span></span></button>; })}</div></fieldset> : null}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span><span className="block text-sm font-semibold text-slate-700">Quantity</span><span className="mt-0.5 block text-xs text-slate-500">{getMarketplaceMinimumOrderLabel(selectedOption)}</span></span>
                      <div className="flex h-10 items-center rounded-xl border border-primary/20 bg-white p-0.5"><button type="button" onClick={() => setSelectionQuantity((current) => Math.max(selectedOption.minimumOrderQuantity, current - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10" aria-label="Decrease selected unit quantity"><Minus className="h-4 w-4" aria-hidden="true" /></button><span className="w-9 text-center text-sm font-bold tabular-nums">{selectionQuantity}</span><button type="button" onClick={() => setSelectionQuantity((current) => current + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10" aria-label="Increase selected unit quantity"><Plus className="h-4 w-4" aria-hidden="true" /></button></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><span className="text-sm text-slate-600">{selectionQuantity} × {getMarketplaceOptionLabel(selectedOption)}</span><button type="button" onClick={addSelectedOptionToCart} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95">Add for {formatMarketplacePrice(getPromotionalPrice(selectedProduct, selectedOption).price * selectionQuantity)}</button></div>
                </>
              ) : null}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </DashboardPageContent>
  );
}
