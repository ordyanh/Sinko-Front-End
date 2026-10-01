import { ArrowLeft, Gift, MapPin, PackageOpen, ShoppingCart, Trash2, UserRound, Phone } from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { useEffect, useState } from "react";
import {
  formatMarketplacePrice,
  getMarketplaceMinimumOrderLabel,
  getMarketplaceOptionLabel,
  getMarketplaceSellingOptions,
  groupMarketplaceCartLinesBySupplier,
  marketplaceProducts,
  type MarketplaceCartLine,
  type MarketplaceProduct,
  type MarketplaceSellingOption,
} from "~/entities/product";
import { getPromotionalPrice, promotionTypeLabels, type PromotionReward } from "~/entities/promotion";
import { DashboardPageContent } from "~/shared/ui";
import { useToast } from "~/shared/ui/toast";
import { getApprovedActiveDeliveryAddresses, type StoredDeliveryAddress } from "~/shared/lib/indexed-db";

export default function HorecaCartPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState<StoredDeliveryAddress[]>([]);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState("");
  const [isLoadingDeliveryAddresses, setIsLoadingDeliveryAddresses] = useState(true);
  const [deliveryAddressError, setDeliveryAddressError] = useState<string>();
  const { cartLines, catalogProducts, promotionRewards, removePromotionGift, completeOrder } = useOutletContext<{
    cartLines: MarketplaceCartLine[];
    catalogProducts: MarketplaceProduct[];
    promotionRewards: PromotionReward[];
    removePromotionGift: (promotionId: string, quantity: number) => void;
    completeOrder: (deliveryAddressId: string) => Promise<void>;
    setCartLineQuantity: (
      product: MarketplaceProduct,
      option: MarketplaceSellingOption,
      quantity: number,
    ) => void;
  }>();
  const paidItemCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const giftItemCount = promotionRewards.reduce((total, reward) => total + reward.quantity, 0);
  const itemCount = paidItemCount + giftItemCount;
  const cartSupplierGroups = groupMarketplaceCartLinesBySupplier(cartLines);
  const total = cartLines.reduce(
    (sum, line) =>
      sum + getPromotionalPrice(line.product, line.option).price * line.quantity,
    0,
  );

  useEffect(() => {
    let isCurrent = true;

    void getApprovedActiveDeliveryAddresses()
      .then((addresses) => {
        if (!isCurrent) return;
        setDeliveryAddresses(addresses);
        // A single eligible destination is the only case where selection is
        // implicit. Multiple destinations always require an explicit choice.
        if (addresses.length === 1) setSelectedDeliveryAddressId(addresses[0].id);
      })
      .catch((error) => {
        if (isCurrent) {
          setDeliveryAddressError(
            error instanceof Error ? error.message : "We couldn't load delivery addresses.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingDeliveryAddresses(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleCompleteOrder() {
    if (!selectedDeliveryAddressId) {
      showToast({
        title: "Choose a delivery address",
        description: "Select an approved delivery address for this order first.",
        variant: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await completeOrder(selectedDeliveryAddressId);
      showToast({ title: "Order placed", description: "Your supplier has received the order.", variant: "success" });
      navigate("/horeca/orders");
    } catch (error) {
      showToast({
        title: "Order wasn't placed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardPageContent>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <Link to="/horeca/products" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Continue browsing
        </Link>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Order review</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-slate-950">Your cart</h1>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary tabular-nums">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
        </div>

        {cartLines.length > 0 ? (
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-100">
                {cartSupplierGroups.map(({ supplier, lines, itemCount }) => {
                  const supplierTotal = lines.reduce((sum, line) => sum + getPromotionalPrice(line.product, line.option).price * line.quantity, 0);
                  const supplierGiftRewards = promotionRewards.filter((reward) => (catalogProducts.find((product) => product.id === reward.productId) ?? marketplaceProducts.find((product) => product.id === reward.productId))?.supplier === supplier);
                  return <section key={supplier} aria-label={`${supplier} products`}>
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                      <h2 className="text-sm font-bold text-slate-800">{supplier}</h2>
                      <span className="text-xs font-medium text-slate-500">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {lines.map(({ product, option, quantity }) => {
                        const { price: unitPrice, promotion: pricePromotion } = getPromotionalPrice(product, option);
                        return <li key={`${product.id}-${option.id}`} className="flex items-center gap-4 p-4">
                    <img src={product.image} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{product.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{getMarketplaceOptionLabel(option)} · {getMarketplaceMinimumOrderLabel(option)}</p>
                      {pricePromotion ? <p className="mt-1 text-xs font-bold text-rose-700">{promotionTypeLabels[pricePromotion.type]} applied · <span className="line-through tabular-nums">{formatMarketplacePrice(option.price)}</span> each</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{formatMarketplacePrice(unitPrice * quantity)}</p>
                      {pricePromotion ? <p className="mt-0.5 text-xs text-slate-400 line-through tabular-nums">{formatMarketplacePrice(option.price * quantity)}</p> : null}
                      <p className="mt-0.5 text-sm text-slate-500 tabular-nums">{quantity} paid × {formatMarketplacePrice(unitPrice)}</p>
                    </div>
                  </li>;
                      })}
                      {supplierGiftRewards.map((reward) => {
                        const giftProduct = catalogProducts.find((product) => product.id === reward.productId) ?? marketplaceProducts.find((product) => product.id === reward.productId);
                        const giftOption = giftProduct ? getMarketplaceSellingOptions(giftProduct).find((option) => option.id === reward.optionId) ?? getMarketplaceSellingOptions(giftProduct)[0] : undefined;
                        if (!giftProduct || !giftOption) return null;
                        return <li key={`${reward.promotion.id}-${reward.productId}`} className="flex items-center gap-4 bg-violet-50/70 p-4"><img src={giftProduct.image} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-violet-200" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-semibold text-slate-900">{giftProduct.title}</p><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700"><Gift className="h-3 w-3" aria-hidden="true" />BXGY reward</span></div><p className="mt-0.5 text-sm text-slate-500">{getMarketplaceOptionLabel(giftOption)} · {reward.quantity} free {reward.quantity === 1 ? "unit" : "units"}</p><p className="mt-1 text-xs font-semibold text-violet-700">{reward.promotion.title} · Free / promotion reward</p></div><div className="flex shrink-0 flex-col items-end gap-2"><p className="text-sm font-bold text-violet-950">0 դրամ</p><button type="button" onClick={() => removePromotionGift(reward.promotion.id, reward.quantity)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50" aria-label={`Remove ${giftProduct.title} free promotion reward`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove reward</button></div></li>;
                      })}
                    </ul>
                    <div className="flex items-center justify-between bg-slate-50/70 px-4 py-3 text-sm text-slate-600"><span>{supplier} subtotal</span><span className="font-bold text-slate-900 tabular-nums">{formatMarketplacePrice(supplierTotal)}</span></div>
                  </section>;
                })}
              </div>
            </div>
            <aside className="h-fit space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Delivery address</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">This destination will be saved with each order in this checkout.</p>
                  </div>
                </div>

                {isLoadingDeliveryAddresses ? (
                  <p className="mt-4 text-sm text-slate-500">Loading approved delivery addresses…</p>
                ) : deliveryAddressError ? (
                  <p className="mt-4 text-sm leading-6 text-rose-700">{deliveryAddressError}</p>
                ) : deliveryAddresses.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-rose-700">No approved, active delivery address is available. Add or reactivate one before placing an order.</p>
                ) : (
                  <fieldset className="mt-4 space-y-2" aria-label="Delivery address">
                    <legend className="sr-only">Select delivery address</legend>
                    {deliveryAddresses.map((address) => {
                      const isSelected = selectedDeliveryAddressId === address.id;
                      return (
                        <label key={address.id} className={`block cursor-pointer rounded-xl border p-3 transition ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-slate-300"}`}>
                          <span className="flex items-start gap-3">
                            <input type="radio" name="delivery-address" value={address.id} checked={isSelected} onChange={() => setSelectedDeliveryAddressId(address.id)} className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary" />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900">{address.label ?? "Delivery address"}</span>
                              <span className="mt-0.5 block text-sm leading-5 text-slate-600">{address.fullAddress}</span>
                              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />{address.contactPerson}</span><span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{address.contactPhone}</span></span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}
              </section>
              <section className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-medium text-slate-300">Products total {giftItemCount > 0 ? `· ${giftItemCount} free promotional ${giftItemCount === 1 ? "unit" : "units"}` : ""}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{formatMarketplacePrice(total)}</p>
              <button type="button" onClick={() => void handleCompleteOrder()} disabled={isSubmitting || isLoadingDeliveryAddresses || !selectedDeliveryAddressId} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-content transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? "Placing order…" : "Complete order"}</button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-400">{deliveryAddresses.length > 1 && !selectedDeliveryAddressId ? "Select a delivery address to continue." : "Your selected address is saved as an order snapshot."}</p>
              </section>
            </aside>
          </div>
        ) : (
          <div className="mt-7 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 text-center">
            <ShoppingCart className="h-7 w-7 text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-900">Your cart is empty</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Start with ingredients and essentials that suit your menu.</p>
            <Link to="/horeca/products" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"><PackageOpen className="h-4 w-4" aria-hidden="true" />Browse products</Link>
          </div>
        )}
      </div>
    </DashboardPageContent>
  );
}
