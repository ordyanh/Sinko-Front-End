import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { CheckCircle2, Gift, Minus, PackageOpen, Plus, ShoppingBag, ShoppingCart, Tag, Trash2, Truck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  formatMarketplacePrice,
  getMarketplaceMinimumOrderLabel,
  getMarketplaceOptionLabel,
  getHorecaMarketplaceProducts,
  getMarketplaceSellingOptions,
  groupMarketplaceCartLinesBySupplier,
  marketplaceProducts,
  type MarketplaceCartLine,
  type MarketplaceProduct,
  type MarketplaceSellingOption,
} from "~/entities/product";
import { getHorecaMarketplacePromotions, getPromotionalPrice, getPromotionRewards, promotionTypeLabels, setMarketplacePromotions, validatePromotionCart, type MarketplacePromotion, type PromotionReward } from "~/entities/promotion";
import { horecaDashboardMenuLinks } from "~/shared/lib/dashboard-nav";
import DashboardLayout from "~/shared/ui/dashboard-layout";
import type { DashboardNotification } from "~/shared/ui";
import {
  createOrder as createBackendOrder,
  createMultiSupplierOrder,
  getNotifications,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  ApiError,
} from "~/shared/api";
import {
  createOrderId,
  getApprovedActiveDeliveryAddressForOrder,
  getLoggedInUser,
  getSupplierUsers,
  saveOrders,
  PROMOTIONS_UPDATED_EVENT,
  type LoggedInUser,
  type StoredOrder,
} from "~/shared/lib/indexed-db";

const horecaNotifications: DashboardNotification[] = [];

function CartButton({ itemCount, onClick }: { itemCount: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-white text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}>
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {itemCount > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-content ring-2 ring-white tabular-nums">{itemCount > 99 ? "99+" : itemCount}</span> : null}
    </button>
  );
}

export default function HorecaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isPreparingDashboard, setIsPreparingDashboard] = useState(true);
  const [authUser, setAuthUser] = useState<LoggedInUser | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [cartLines, setCartLines] = useState<MarketplaceCartLine[]>([]);
  const [promotions, setPromotions] = useState<MarketplacePromotion[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<MarketplaceProduct[]>([]);
  const [promotionGiftProductIds, setPromotionGiftProductIds] = useState<Record<string, string>>({});
  const [dismissedPromotionGiftQuantities, setDismissedPromotionGiftQuantities] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [earnedReward, setEarnedReward] = useState<PromotionReward | null>(null);
  const rewardSignature = useRef("");

  useEffect(() => {
    let isActive = true;

    async function initHoreca() {
      const existingUser = await getLoggedInUser();
      if (!isActive) return;
      if (!existingUser || existingUser.role !== "horeca") {
        navigate("/login", { replace: true });
        return;
      }
      const user = existingUser;

      const [nextPromotions, nextCatalogProducts] = await Promise.all([
        getHorecaMarketplacePromotions(),
        getHorecaMarketplaceProducts(),
      ]);
      if (!isActive) return;
      setMarketplacePromotions(nextPromotions);
      setPromotions(nextPromotions);
      setCatalogProducts(nextCatalogProducts);
      setAuthUser(user);
      setIsPreparingDashboard(false);

      try {
        const notifs = await getNotifications();
        if (Array.isArray(notifs) && notifs.length > 0 && isActive) {
          setNotifications(
            notifs.map((n) => ({
              id: n.id,
              title: n.title,
              detail: n.message,
              time: new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
              icon: n.title.toLowerCase().includes("delivery") ? Truck : CheckCircle2,
              accentClassName: n.isRead ? "bg-slate-100 text-slate-700" : "bg-sky-100 text-sky-700",
              unread: !n.isRead,
            })),
          );
        }
      } catch {
        // Fallback to local default notifications
      }
    }

    void initHoreca();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function refreshPromotions() {
      void getHorecaMarketplacePromotions().then((nextPromotions) => {
        setMarketplacePromotions(nextPromotions);
        setPromotions(nextPromotions);
      });
    }
    window.addEventListener(PROMOTIONS_UPDATED_EVENT, refreshPromotions);
    return () => window.removeEventListener(PROMOTIONS_UPDATED_EVENT, refreshPromotions);
  }, []);

  const isShoppingRoute = location.pathname.startsWith("/horeca/products") || location.pathname === "/horeca/cart";
  const paidItemCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const earnedPromotionRewards = useMemo(
    () => getPromotionRewards(cartLines, promotionGiftProductIds),
    [cartLines, promotionGiftProductIds],
  );
  const promotionRewards = useMemo(
    () => earnedPromotionRewards.flatMap((reward) => {
      const quantity = reward.quantity - (dismissedPromotionGiftQuantities[reward.promotion.id] ?? 0);
      return quantity > 0 ? [{ ...reward, quantity }] : [];
    }),
    [dismissedPromotionGiftQuantities, earnedPromotionRewards],
  );
  const giftItemCount = promotionRewards.reduce((total, reward) => total + reward.quantity, 0);
  const itemCount = paidItemCount + giftItemCount;
  const cartSupplierGroups = useMemo(
    () => groupMarketplaceCartLinesBySupplier(cartLines),
    [cartLines],
  );
  const cartTotal = cartLines.reduce(
    (total, line) =>
      total + getPromotionalPrice(line.product, line.option).price * line.quantity,
    0,
  );

  useEffect(() => {
    const nextSignature = promotionRewards.map((reward) => `${reward.promotion.id}:${reward.quantity}`).join(",");
    if (nextSignature && nextSignature !== rewardSignature.current) setEarnedReward(promotionRewards[0]);
    rewardSignature.current = nextSignature;
  }, [promotionRewards]);

  function setCartLineQuantity(
    product: MarketplaceProduct,
    option: MarketplaceSellingOption,
    quantity: number,
  ) {
    const nextQuantity =
      quantity <= 0 ? 0 : Math.max(option.minimumOrderQuantity, quantity);

    const numericProductId = parseInt(String(product.id).replace(/\D/g, ""), 10) || 1;
    if (nextQuantity === 0) {
      removeFromCart(numericProductId).catch(() => {});
    } else {
      addToCart(numericProductId, nextQuantity).catch(() => {});
    }

    setCartLines((currentLines) => {
      const existingLine = currentLines.find(
        (line) => line.product.id === product.id && line.option.id === option.id,
      );

      if (!existingLine && nextQuantity === 0) return currentLines;
      if (!existingLine) return [...currentLines, { product, option, quantity: nextQuantity }];
      if (nextQuantity === 0) {
        return currentLines.filter(
          (line) => !(line.product.id === product.id && line.option.id === option.id),
        );
      }
      return currentLines.map((line) =>
        line.product.id === product.id && line.option.id === option.id
          ? { ...line, quantity: nextQuantity }
          : line,
      );
    });
  }

  function setPromotionGiftProductId(promotionId: string, productId: string) {
    setPromotionGiftProductIds((current) => ({ ...current, [promotionId]: productId }));
    setDismissedPromotionGiftQuantities(({ [promotionId]: _dismissedQuantity, ...current }) => current);
  }

  function removePromotionGift(promotionId: string, quantity: number) {
    setDismissedPromotionGiftQuantities((current) => ({
      ...current,
      [promotionId]: (current[promotionId] ?? 0) + quantity,
    }));
    setEarnedReward((current) => current?.promotion.id === promotionId ? null : current);
  }

  async function completeOrder(deliveryAddressId: string) {
    const customer = await getLoggedInUser();
    if (!customer || customer.role !== "horeca") {
      throw new Error("You need to be signed in as a HoReCa account to place an order.");
    }
    // The mock backend resolves this from the signed-in company and validates
    // that it remains both approved and active immediately before persistence.
    const deliveryAddressSnapshot = await getApprovedActiveDeliveryAddressForOrder(deliveryAddressId);

    const selectedRewards = Object.fromEntries(
      promotionRewards.map((reward) => [reward.promotion.id, reward.productId]),
    );
    // This mock is our backend boundary: re-check the active period, company,
    // paid quantity, configured gift and supplier ownership before persisting.
    const validatedRewards = validatePromotionCart({
      lines: cartLines,
      selectedGiftProductIds: selectedRewards,
      horecaAccountId: customer.id,
    });
    const suppliers = await getSupplierUsers();
    const placedAt = new Date();
    const deliveryDate = new Date(placedAt);
    deliveryDate.setDate(deliveryDate.getDate() + 2);
    const orders = groupMarketplaceCartLinesBySupplier(cartLines).map((group): StoredOrder => {
      const supplierAccountId = group.lines[0]?.product.supplierId;
      const supplier = suppliers.find((candidate) => candidate.id === supplierAccountId);
      if (!supplierAccountId || !supplier) {
        throw new Error(`We couldn't identify the supplier for ${group.supplier}.`);
      }

      return {
        id: createOrderId(),
        horecaAccountId: customer.id,
        horecaName: customer.companyName,
        horecaContactName: customer.displayName,
        horecaEmail: customer.email,
        horecaPhone: deliveryAddressSnapshot.contactPhone,
        horecaAddress: deliveryAddressSnapshot.fullAddress,
        supplierAccountId,
        supplierId: supplierAccountId,
        supplierName: supplier.companyName,
        supplierContactName: supplier.displayName,
        supplierEmail: supplier.email,
        supplierPhone: "—",
        supplierAddress: supplier.address,
        placedAt: placedAt.toISOString(),
        offerReceivedAt: null,
        deliveryDate: deliveryDate.toISOString().slice(0, 10),
        deliveryAddress: deliveryAddressSnapshot.fullAddress,
        deliveryAddressSnapshot,
        status: "New",
        lines: [
          ...group.lines.map((line) => ({
          id: `${line.product.id}-${line.option.id}`,
          productId: line.product.id,
          sellingOptionId: line.option.id,
          name: line.product.title,
          image: line.product.image,
          unit: getMarketplaceOptionLabel(line.option),
          minimumOrderQuantity: line.option.minimumOrderQuantity,
          requestedQuantity: line.quantity,
          requestedPrice: getPromotionalPrice(line.product, line.option).price,
          offeredQuantity: line.quantity,
          offeredPrice: getPromotionalPrice(line.product, line.option).price,
          comment: "",
          })),
          ...validatedRewards.flatMap((reward) => {
            const giftProduct = catalogProducts.find((product) => product.id === reward.productId)
              ?? marketplaceProducts.find((product) => product.id === reward.productId);
            const giftOption = giftProduct
              ? getMarketplaceSellingOptions(giftProduct).find((option) => option.id === reward.optionId)
              : undefined;
            if (!giftProduct || !giftOption || giftProduct.supplier !== group.supplier) return [];
            return [{
              id: `promotion-${reward.promotion.id}-${giftProduct.id}-${giftOption.id}`,
              productId: giftProduct.id,
              sellingOptionId: giftOption.id,
              name: giftProduct.title,
              image: giftProduct.image,
              unit: getMarketplaceOptionLabel(giftOption),
              minimumOrderQuantity: 1,
              requestedQuantity: reward.quantity,
              requestedPrice: 0,
              offeredQuantity: reward.quantity,
              offeredPrice: 0,
              comment: "",
              promotionId: reward.promotion.id,
              promotionTitle: reward.promotion.title,
              isPromotionGift: true,
            }];
          }),
        ],
        history: [{
          id: "created",
          actor: "restaurant",
          label: `Order sent to ${supplier.companyName}`,
          date: placedAt.toISOString(),
        }],
      };
    });

    try {
      if (orders.length === 1) {
        const o = orders[0];
        const res = await createBackendOrder({
          suplierId: o.supplierId,
          supplierId: o.supplierId,
          deliveryAddressId: o.deliveryAddressSnapshot?.addressId,
          description: o.lines.map((l) => `${l.name} x${l.requestedQuantity}`).join(", "),
          products: o.lines.map((l) => ({
            productId: parseInt(String(l.productId).replace(/\D/g, ""), 10) || 1,
            count: l.requestedQuantity,
          })),
        });
        if (res?.orderId || res?.id) {
          o.id = res.orderId || res.id;
        }
      } else if (orders.length > 1) {
        const createdOrders = await createMultiSupplierOrder({
          deliveryAddressId: deliveryAddressSnapshot.addressId,
          description: "Multi-supplier order",
          supplierOrders: orders.map((o) => ({
            supplierId: o.supplierId,
            description: o.lines.map((l) => `${l.name} x${l.requestedQuantity}`).join(", "),
            products: o.lines.map((l) => ({
              productId: parseInt(String(l.productId).replace(/\D/g, ""), 10) || 1,
              count: l.requestedQuantity,
            })),
          })),
        });
        if (Array.isArray(createdOrders)) {
          createdOrders.forEach((created, idx) => {
            if (orders[idx] && (created.orderId || created.id)) {
              orders[idx].id = created.orderId || created.id;
            }
          });
        }
      }
    } catch (backendError) {
      // If it's a 400 Bad Request, 401 Unauthorized, or 403 Forbidden:
      // It is a real validation or permission failure that should be displayed to the user!
      if (backendError instanceof ApiError && (backendError.status === 400 || backendError.status === 401 || backendError.status === 403)) {
        throw backendError;
      }
      // Offline / 502 Bad Gateway fallback to IndexedDB
    }

    await saveOrders(orders);
    clearCart().catch(() => {});
    setCartLines([]);
    setPromotionGiftProductIds({});
    setDismissedPromotionGiftQuantities({});
    setEarnedReward(null);
    rewardSignature.current = "";
    setIsCartOpen(false);
  }

  const cartButton = isShoppingRoute ? <CartButton itemCount={itemCount} onClick={() => setIsCartOpen(true)} /> : undefined;

  if (isPreparingDashboard) {
    return null;
  }

  return (
    <>
      <DashboardLayout accountType="horeca" menuLinks={horecaDashboardMenuLinks} userName={authUser?.displayName ?? ""} companyName={authUser?.companyName ?? ""} logoutHref="/logout" notifications={notifications} desktopHeaderAction={cartButton} mobileHeaderAction={cartButton}>
        <Outlet context={{ cartLines, setCartLineQuantity, promotions, catalogProducts, promotionRewards, promotionGiftProductIds, setPromotionGiftProductId, removePromotionGift, completeOrder }} />
      </DashboardLayout>

      <Dialog open={isCartOpen} onClose={setIsCartOpen} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] transition duration-200 data-closed:opacity-0" />
        <div className="fixed inset-0 flex justify-end">
          <DialogPanel className="flex h-full w-full max-w-md flex-col bg-[#fcfaf5] shadow-2xl transition duration-300 data-closed:translate-x-full sm:w-[28rem]">
            <div className="flex items-center justify-between border-b border-[#e5dfd0] px-5 py-5 sm:px-6">
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-950">Your order</DialogTitle>
                <p className="mt-0.5 text-sm text-slate-500">{itemCount === 0 ? "Your cart is waiting for ingredients." : `${itemCount} ${itemCount === 1 ? "item" : "items"} ready to review`}</p>
              </div>
              <button type="button" onClick={() => setIsCartOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Close cart"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>

            {cartLines.length > 0 ? (
              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-6">
                  {cartSupplierGroups.map(({ supplier, lines, itemCount }) => {
                    const supplierTotal = lines.reduce((sum, line) => sum + getPromotionalPrice(line.product, line.option).price * line.quantity, 0);
                    const supplierGiftRewards = promotionRewards.filter((reward) => (catalogProducts.find((product) => product.id === reward.productId) ?? marketplaceProducts.find((product) => product.id === reward.productId))?.supplier === supplier);
                    return <section key={supplier} aria-label={`${supplier} products`}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{supplier}</h3>
                        <span className="text-xs font-medium text-slate-400">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                      </div>
                      <ul className="space-y-4">
                        {lines.map(({ product, option, quantity }) => {
                          const { price: unitPrice, promotion: pricePromotion } = getPromotionalPrice(product, option);
                          return (
                    <li key={`${product.id}-${option.id}`} className="flex gap-3">
                      {product.image ? (
                        <img src={product.image} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                          <PackageOpen className="h-6 w-6 text-slate-400" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{product.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{getMarketplaceOptionLabel(option)} · {formatMarketplacePrice(unitPrice)} each · {getMarketplaceMinimumOrderLabel(option)}</p>
                        {pricePromotion ? <p className="mt-1 text-xs font-bold text-rose-700">{promotionTypeLabels[pricePromotion.type]} applied · <span className="line-through tabular-nums">{formatMarketplacePrice(option.price)}</span> each</p> : null}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex h-8 items-center rounded-lg border border-primary/20 bg-white p-0.5">
                            <button type="button" onClick={() => setCartLineQuantity(product, option, quantity - 1)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition hover:bg-primary/10" aria-label={`Decrease ${product.title} quantity`}><Minus className="h-3.5 w-3.5" aria-hidden="true" /></button>
                            <span className="w-7 text-center text-sm font-bold tabular-nums">{quantity}</span>
                            <button type="button" onClick={() => setCartLineQuantity(product, option, quantity + 1)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition hover:bg-primary/10" aria-label={`Increase ${product.title} quantity`}><Plus className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-right"><span className="block text-sm font-bold text-slate-900 tabular-nums">{formatMarketplacePrice(unitPrice * quantity)}</span>{pricePromotion ? <span className="block text-xs text-slate-400 line-through tabular-nums">{formatMarketplacePrice(option.price * quantity)}</span> : null}</span>
                            <button type="button" onClick={() => setCartLineQuantity(product, option, 0)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${product.title} from cart`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                          </div>
                        </div>
                      </div>
                    </li>
                          );
                        })}
                        {supplierGiftRewards.map((reward) => {
                          const giftProduct = catalogProducts.find((product) => product.id === reward.productId) ?? marketplaceProducts.find((product) => product.id === reward.productId);
                          const giftOption = giftProduct ? getMarketplaceSellingOptions(giftProduct).find((option) => option.id === reward.optionId) ?? getMarketplaceSellingOptions(giftProduct)[0] : undefined;
                          if (!giftProduct || !giftOption) return null;
                          return <li key={`${reward.promotion.id}-${reward.productId}`} className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">{giftProduct.image ? (
                            <img src={giftProduct.image} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-violet-200" />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200">
                              <Gift className="h-6 w-6" aria-hidden="true" />
                            </div>
                          )}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{giftProduct.title}</p><p className="mt-0.5 text-xs text-slate-500">{getMarketplaceOptionLabel(giftOption)} · {reward.quantity} free {reward.quantity === 1 ? "unit" : "units"}</p></div><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700"><Gift className="h-3 w-3" aria-hidden="true" />BXGY reward</span></div><p className="mt-2 text-xs font-semibold text-violet-700">{reward.promotion.title} · Free / promotion reward</p><div className="mt-2 flex items-center justify-between gap-2"><p className="text-sm font-bold text-violet-950">Free · 0 դրամ</p><button type="button" onClick={() => removePromotionGift(reward.promotion.id, reward.quantity)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50" aria-label={`Remove ${giftProduct.title} free promotion reward`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove reward</button></div></div></li>;
                        })}
                      </ul>
                      <div className="mt-3 flex justify-between border-t border-[#e5dfd0] pt-3 text-xs text-slate-500"><span>{supplier} subtotal</span><span className="font-bold text-slate-800 tabular-nums">{formatMarketplacePrice(supplierTotal)}</span></div>
                    </section>
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e8efe3] text-[#55704d]"><PackageOpen className="h-7 w-7" aria-hidden="true" /></span>
                <p className="mt-4 font-semibold text-slate-900">Nothing in your cart</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Add products from the marketplace when you&apos;re ready.</p>
              </div>
            )}

            <div className="border-t border-[#e5dfd0] bg-white/70 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-600"><span>Products total {giftItemCount > 0 ? `· ${giftItemCount} free` : ""}</span><span className="font-bold text-slate-950 tabular-nums">{formatMarketplacePrice(cartTotal)}</span></div>
              <Link to="/horeca/cart" onClick={() => setIsCartOpen(false)} className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-content shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Review and complete order</Link>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={Boolean(earnedReward)} onClose={() => setEarnedReward(null)} className="relative z-[60]">
        <DialogBackdrop className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4"><DialogPanel className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Gift className="h-7 w-7" aria-hidden="true" /></span><DialogTitle className="mt-4 text-xl font-bold text-slate-950">Free gift added</DialogTitle><p className="mt-2 text-sm leading-6 text-slate-600">{earnedReward ? `${earnedReward.quantity} free unit${earnedReward.quantity === 1 ? "" : "s"} from “${earnedReward.promotion.title}” is now separate from your paid quantity in the cart.` : ""}</p><button type="button" onClick={() => setEarnedReward(null)} className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content">Continue shopping</button></DialogPanel></div>
      </Dialog>
    </>
  );
}
