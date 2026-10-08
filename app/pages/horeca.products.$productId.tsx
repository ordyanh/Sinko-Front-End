import { ArrowLeft, Check, Gift, Minus, Package, Plus, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router";
import {
  formatMarketplacePrice,
  getHorecaMarketplaceProducts,
  getMarketplaceMinimumOrderLabel,
  getMarketplaceOptionLabel,
  getMarketplaceSellingOptions,
  mapBackendMarketplaceProduct,
  type MarketplaceCartLine,
  type MarketplaceProduct,
  type MarketplaceSellingOption,
} from "~/entities/product";
import {
  getPromotionGiftChoices,
  getPromotionalPrice,
  getPromotionsForProduct,
  promotionTypeLabels,
} from "~/entities/promotion";
import { getMarketplaceProductById } from "~/shared/api/marketplace";
import { DashboardPageContent } from "~/shared/ui";

type MarketplaceContext = {
  cartLines: MarketplaceCartLine[];
  promotionGiftProductIds: Record<string, string>;
  setCartLineQuantity: (
    product: MarketplaceProduct,
    option: MarketplaceSellingOption,
    quantity: number,
  ) => void;
  setPromotionGiftProductId: (promotionId: string, productId: string) => void;
};

export default function HorecaProductDetailPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);
  const product = products.find((item) => item.id === productId);
  const { cartLines, promotionGiftProductIds, setCartLineQuantity, setPromotionGiftProductId } = useOutletContext<MarketplaceContext>();
  const options = product ? getMarketplaceSellingOptions(product) : [];
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id ?? "");
  const [quantity, setQuantity] = useState(options[0]?.minimumOrderQuantity ?? 1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      try {
        const catalog = await getHorecaMarketplaceProducts();
        if (!isCurrent) return;

        let found = catalog.find((item) => item.id === productId);
        if (!found && productId) {
          const direct = await getMarketplaceProductById(productId);
          if (direct && isCurrent) {
            const mapped = mapBackendMarketplaceProduct(direct);
            setProducts([...catalog, mapped]);
            return;
          }
        }
        setProducts(catalog);
      } catch {
        if (isCurrent) setProductLoadError("We couldn't load this product from the supplier catalog.");
      } finally {
        if (isCurrent) setIsLoadingProduct(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [productId]);

  useEffect(() => {
    const firstOption = options[0];
    setSelectedOptionId(firstOption?.id ?? "");
    setQuantity(firstOption?.minimumOrderQuantity ?? 1);
    setIsAdded(false);
  }, [productId, product?.id]);

  if (isLoadingProduct) {
    return (
      <DashboardPageContent className="max-w-5xl">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-medium text-slate-500">
          Loading product…
        </div>
      </DashboardPageContent>
    );
  }

  if (!product) {
    return (
      <DashboardPageContent className="max-w-5xl">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h1 className="text-xl font-bold text-slate-950">{productLoadError ? "Product unavailable" : "Product not found"}</h1>
          {productLoadError ? <p className="mt-2 text-sm text-slate-500">{productLoadError}</p> : null}
          <Link to="/horeca/products" className="mt-4 inline-flex text-sm font-semibold text-primary">Back to products</Link>
        </div>
      </DashboardPageContent>
    );
  }

  const selectedOption = options.find((option) => option.id === selectedOptionId) ?? options[0];
  const { price, promotion: pricePromotion } = getPromotionalPrice(product, selectedOption);
  const requestedPromotionId = searchParams.get("promotion");
  const choicePromotion = getPromotionsForProduct(product.id).find(
    (promotion) => promotion.id === requestedPromotionId && promotion.type === "BuyXGetY" && promotion.productIds[0] === product.id && promotion.giftChoices?.length,
  ) ?? getPromotionsForProduct(product.id).find(
    (promotion) => promotion.type === "BuyXGetY" && promotion.productIds[0] === product.id && promotion.giftChoices?.length,
  );
  const activeChoicePromotion = choicePromotion && (!choicePromotion.triggerOptionId || choicePromotion.triggerOptionId === selectedOption.id)
    ? choicePromotion
    : undefined;
  const giftChoices = activeChoicePromotion ? getPromotionGiftChoices(activeChoicePromotion) : [];
  const selectedGiftProductId = activeChoicePromotion
    ? promotionGiftProductIds[activeChoicePromotion.id] ?? giftChoices[0]?.productId
    : undefined;

  function selectOption(option: MarketplaceSellingOption) {
    setSelectedOptionId(option.id);
    setQuantity(option.minimumOrderQuantity);
    setIsAdded(false);
  }

  function addToCart() {
    const productToAdd = product;
    if (!productToAdd || !selectedOption) return;
    // The first gift is visibly selected when the buyer opens this offer. Make
    // that selection real when they confirm the paid product, so the reward
    // calculation never loses it simply because the buyer did not click the
    // already-selected card a second time.
    if (activeChoicePromotion && selectedGiftProductId) {
      setPromotionGiftProductId(activeChoicePromotion.id, selectedGiftProductId);
    }
    const existingQuantity = cartLines.find(
      (line) => line.product.id === productToAdd.id && line.option.id === selectedOption.id,
    )?.quantity ?? 0;
    setCartLineQuantity(productToAdd, selectedOption, existingQuantity + quantity);
    setIsAdded(true);
  }

  return (
    <DashboardPageContent className="max-w-6xl">
      <Link to="/horeca/products" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All products
      </Link>

      <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div className="relative min-h-64 overflow-hidden bg-[#e9efe6] sm:min-h-80 lg:min-h-[34rem]">
            <img src={product.image} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/35 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur sm:inset-x-auto sm:bottom-7 sm:left-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{product.category}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Supplied by {product.supplier}</p>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Marketplace product</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-4xl">{product.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Order the format that suits your prep schedule. Minimum quantities are shown for every selling unit.</p>

            <div className="mt-6 flex flex-col items-start gap-2 border-y border-slate-100 py-4 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
              <div>
                <p className="whitespace-nowrap text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{formatMarketplacePrice(price)}</p>
                <p className="mt-1 text-xs text-slate-500">per {getMarketplaceOptionLabel(selectedOption)}</p>
              </div>
              {pricePromotion ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{pricePromotion.benefitLabel}</span> : null}
            </div>

            <fieldset className="mt-6">
              <legend className="text-sm font-bold text-slate-900">Choose a selling unit</legend>
              <div className="mt-3 grid gap-2">
                {options.map((option) => {
                  const active = option.id === selectedOption.id;
                  const optionPrice = getPromotionalPrice(product, option).price;
                  return (
                    <button key={option.id} type="button" onClick={() => selectOption(option)} className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-primary/40"}`}>
                      <span className="flex min-w-0 items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-primary-content" : "bg-slate-100 text-slate-500"}`}><Package className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0"><span className="block break-words text-sm font-semibold text-slate-900">{getMarketplaceOptionLabel(option)}</span><span className="mt-0.5 block text-xs text-slate-500">{getMarketplaceMinimumOrderLabel(option)}</span></span></span>
                      <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-950 tabular-nums">{formatMarketplacePrice(optionPrice)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-[#fcfdfb] p-5 sm:p-8">
          {activeChoicePromotion ? (
            <section className="rounded-3xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5" aria-labelledby="gift-choice-heading">
              <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Gift className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Buy X, get Y</p><h2 id="gift-choice-heading" className="mt-0.5 text-lg font-bold tracking-tight text-violet-950">{activeChoicePromotion.benefitLabel}</h2><p className="mt-1 text-sm leading-5 text-violet-800">Buy {activeChoicePromotion.buyQuantity} {getMarketplaceOptionLabel(selectedOption)} and choose one complimentary item.</p></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {giftChoices.map((choice) => {
                  const giftProduct = products.find((item) => item.id === choice.productId);
                  if (!giftProduct) return null;
                  const active = selectedGiftProductId === choice.productId;
                  return <button key={choice.productId} type="button" onClick={() => setPromotionGiftProductId(activeChoicePromotion.id, choice.productId)} aria-pressed={active} className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${active ? "border-violet-500 bg-white shadow-sm ring-1 ring-violet-300" : "border-violet-100 bg-white/60 hover:border-violet-300"}`}><img src={giftProduct.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /><span className="min-w-0"><span className="block break-words text-sm font-bold text-slate-900">{giftProduct.title}</span><span className="mt-0.5 block text-xs text-slate-500">{getMarketplaceOptionLabel(getMarketplaceSellingOptions(giftProduct).find((option) => option.id === choice.optionId) ?? getMarketplaceSellingOptions(giftProduct)[0])}</span></span>{active ? <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-white"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span> : null}</button>;
                })}
              </div>
              <p className="mt-3 text-xs font-medium text-violet-700">Your selected gift is added as a separate 0 դրամ line only after the qualifying quantity is in your cart.</p>
            </section>
          ) : choicePromotion ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span className="font-bold">Gift offer:</span> choose the 1 L bottle to unlock {choicePromotion.benefitLabel.toLowerCase()}.</div> : null}

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-4 sm:justify-start"><div><p className="text-sm font-bold text-slate-900">Quantity</p><p className="mt-0.5 text-xs text-slate-500">{getMarketplaceMinimumOrderLabel(selectedOption)}</p></div><div className="flex h-10 items-center rounded-xl border border-primary/20 bg-white p-0.5"><button type="button" onClick={() => setQuantity((current) => Math.max(selectedOption.minimumOrderQuantity, current - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10" aria-label="Decrease quantity"><Minus className="h-4 w-4" aria-hidden="true" /></button><span className="w-9 text-center text-sm font-bold tabular-nums">{quantity}</span><button type="button" onClick={() => setQuantity((current) => current + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10" aria-label="Increase quantity"><Plus className="h-4 w-4" aria-hidden="true" /></button></div></div>
            <div className="sm:text-right"><p className="text-sm text-slate-500">Subtotal <span className="ml-1 whitespace-nowrap font-bold text-slate-950 tabular-nums">{formatMarketplacePrice(price * quantity)}</span></p><button type="button" onClick={addToCart} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"><ShoppingBasket className="h-4 w-4" aria-hidden="true" />{isAdded ? "Added to cart" : "Add to cart"}</button></div>
          </div>
        </div>
      </section>
    </DashboardPageContent>
  );
}
