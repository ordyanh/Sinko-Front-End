import { getHorecaMarketplaceProducts, marketplaceProducts } from "~/entities/product";
import { getAllSupplierPromotions, getLoggedInUser, getSupplierUsers, type StoredSupplierPromotion } from "~/shared/lib/indexed-db";

type PromotionProduct = { id: string; supplier?: string };
type PromotionSellingOption = { id: string; price: number };
type PromotionCartLine = { product: PromotionProduct; option: PromotionSellingOption; quantity: number };

export type PromotionType = "FixedPrice" | "Percentage" | "BuyXGetY";

export type PromotionDisplay = "home-banner" | "promotion-list" | "both";

export type MarketplacePromotion = {
  id: string;
  supplierName: string;
  title: string;
  description: string;
  type: PromotionType;
  startDate: string;
  endDate: string;
  productIds: string[];
  benefitLabel: string;
  conditions: string;
  display: PromotionDisplay;
  /** Controls discovery banners only; product and cart promotion rules stay visible. */
  isBannerEnabled?: boolean;
  /** Optional supplier-uploaded artwork used by marketplace promotion banners. */
  visualUrl?: string;
  fixedPrice?: number;
  /** Fixed prices keyed by `${productId}:${sellingOptionId}` when configured per option. */
  fixedPricesByOption?: Record<string, number>;
  discountPercent?: number;
  /** Product-option keys eligible for a price promotion. Empty means all options. */
  discountOptionKeys?: string[];
  buyQuantity?: number;
  triggerOptionId?: string;
  giftProductId?: string;
  giftOptionId?: string;
  giftQuantity?: number;
  /** A Buy X, get Y promotion can offer a choice of free products. */
  giftChoices?: { productId: string; optionId: string }[];
  /** Omit for an offer available to every HoReCa company. */
  eligibleHorecaAccountIds?: string[];
  tone: "green" | "gold" | "violet" | "coral";
};

export type PromotionReward = {
  promotion: MarketplacePromotion;
  productId: string;
  optionId: string;
  quantity: number;
};

export type PromotionCartValidationInput = {
  lines: PromotionCartLine[];
  selectedGiftProductIds: Record<string, string>;
  horecaAccountId?: string;
  now?: Date;
};

export const marketplacePromotions: MarketplacePromotion[] = [];

let currentMarketplacePromotions = marketplacePromotions;

/** The in-memory projection is refreshed from IndexedDB by the HoReCa shell. */
export function setMarketplacePromotions(promotions: MarketplacePromotion[]) {
  currentMarketplacePromotions = promotions;
}

export function getMarketplacePromotions() {
  return currentMarketplacePromotions;
}

export function getPromotionTone(color: string): MarketplacePromotion["tone"] {
  if (/8e57|c185|b774/i.test(color)) return "gold";
  if (/4f3a|765b|6550/i.test(color)) return "violet";
  if (/923d|c85d/i.test(color)) return "coral";
  return "green";
}

function marketplacePromotionFromStored(
  promotion: StoredSupplierPromotion,
  supplierName: string,
): MarketplacePromotion | null {
  const giftChoices = promotion.giftChoices?.length
    ? promotion.giftChoices
    : promotion.targetProductId && promotion.targetOptionId
      ? [{ productId: promotion.targetProductId, optionId: promotion.targetOptionId }]
      : [];
  const triggerQuantity = Number(promotion.triggerQuantity);
  const giftQuantity = Number(promotion.targetQuantity);
  const fixedPrice = Number(Object.values(promotion.fixedPrices)[0]);
  const discountPercent = Number(promotion.discountPercent);

  if (promotion.type === "BuyXGetY" && (!promotion.triggerProductId || !promotion.triggerOptionId || !Number.isInteger(triggerQuantity) || triggerQuantity < 1 || !giftChoices.length || !Number.isInteger(giftQuantity) || giftQuantity < 1)) return null;
  if (promotion.type === "FixedPrice" && (!Number.isFinite(fixedPrice) || fixedPrice < 0)) return null;
  if (promotion.type === "Percentage" && (!Number.isFinite(discountPercent) || discountPercent <= 0)) return null;

  const productIds = promotion.type === "BuyXGetY"
    ? [promotion.triggerProductId!, ...giftChoices.map((choice) => choice.productId)]
    : promotion.productIds;
  const benefitLabel = promotion.type === "BuyXGetY"
    ? `Buy ${triggerQuantity}, choose ${giftQuantity} free`
    : promotion.type === "FixedPrice"
      ? `${new Intl.NumberFormat("en-US").format(fixedPrice)} դրամ fixed price`
      : `${discountPercent}% off`;
  const conditions = promotion.type === "BuyXGetY"
    ? `Buy ${triggerQuantity} qualifying units and choose ${giftQuantity} configured free item${giftQuantity === 1 ? "" : "s"} per order.`
    : promotion.type === "FixedPrice"
      ? "Applies to the supplier-configured selling options while this promotion is active."
      : "Applies to the supplier-configured products and selling options while this promotion is active.";

  return {
    id: promotion.id,
    supplierName,
    title: promotion.name,
    description: promotion.description,
    type: promotion.type,
    startDate: promotion.startDate,
    endDate: promotion.endDate ?? "2099-12-31T23:59:59Z",
    productIds,
    benefitLabel,
    conditions,
    display: promotion.display,
    isBannerEnabled: promotion.isBannerEnabled,
    visualUrl: promotion.bannerImage?.dataUrl,
    fixedPrice: promotion.type === "FixedPrice" ? fixedPrice : undefined,
    fixedPricesByOption: promotion.type === "FixedPrice"
      ? Object.fromEntries(Object.entries(promotion.fixedPrices).map(([key, value]) => [key, Number(value)]))
      : undefined,
    discountPercent: promotion.type === "Percentage" ? discountPercent : undefined,
    discountOptionKeys: promotion.type !== "BuyXGetY" && promotion.discountScope === "specific-options"
      ? promotion.discountOptionKeys
      : undefined,
    buyQuantity: promotion.type === "BuyXGetY" ? triggerQuantity : undefined,
    triggerOptionId: promotion.triggerOptionId,
    giftQuantity: promotion.type === "BuyXGetY" ? giftQuantity : undefined,
    giftChoices: promotion.type === "BuyXGetY" ? giftChoices : undefined,
    eligibleHorecaAccountIds: promotion.eligibility === "specific-customers" ? promotion.eligibleCustomerIds : undefined,
    tone: getPromotionTone(promotion.brandColorFallback),
  };
}

/**
 * The HoReCa read model. This acts as the IndexedDB mock's promotion-details
 * endpoint: it verifies supplier ownership, active catalog associations and
 * customer eligibility before returning a promotion to the dashboard.
 */
export async function getHorecaMarketplacePromotions(): Promise<MarketplacePromotion[]> {
  const [customer, suppliers, storedPromotions, catalog] = await Promise.all([
    getLoggedInUser(),
    getSupplierUsers(),
    getAllSupplierPromotions(),
    getHorecaMarketplaceProducts(),
  ]);
  if (!customer || customer.role !== "horeca") return [];
  const productsById = new Map(catalog.map((product) => [product.id, product]));

  return storedPromotions.flatMap((stored) => {
    const supplier = suppliers.find((candidate) => candidate.id === stored.accountId);
    if (!supplier || stored.status !== "Active") return [];
    if (stored.eligibility === "specific-customers" && !stored.eligibleCustomerIds.includes(customer.id)) return [];
    const promotion = marketplacePromotionFromStored(stored, supplier.companyName);
    if (!promotion) return [];
    const associatedProducts = promotion.productIds.map((id) => productsById.get(id));
    if (associatedProducts.some((product) => !product || product.supplierId !== supplier.id)) return [];
    if (promotion.type === "BuyXGetY") {
      const triggerProduct = productsById.get(stored.triggerProductId ?? "");
      const triggerExists = triggerProduct?.sellingOptions?.some((option) => option.id === stored.triggerOptionId);
      const giftsExist = promotion.giftChoices?.every((choice) => productsById.get(choice.productId)?.sellingOptions?.some((option) => option.id === choice.optionId));
      if (!triggerExists || !giftsExist) return [];
    }
    return [promotion];
  });
}

export const promotionTypeLabels: Record<PromotionType, string> = {
  FixedPrice: "Fixed price",
  Percentage: "Percentage discount",
  BuyXGetY: "Buy X, get Y",
};

export function getPromotionProductIds(promotion: MarketplacePromotion) {
  return promotion.type === "BuyXGetY"
    ? [
        ...new Set([
          ...promotion.productIds,
          ...(promotion.giftProductId ? [promotion.giftProductId] : []),
          ...(promotion.giftChoices?.map((choice) => choice.productId) ?? []),
        ]),
      ]
    : promotion.productIds;
}

export function getPromotionGiftChoices(promotion: MarketplacePromotion) {
  if (promotion.giftChoices?.length) return promotion.giftChoices;
  return promotion.giftProductId && promotion.giftOptionId
    ? [{ productId: promotion.giftProductId, optionId: promotion.giftOptionId }]
    : [];
}

/**
 * This is the policy boundary used by the IndexedDB-backed marketplace mock.
 * Keeping the time check here makes the same rule available to discovery,
 * cart calculation and the final order write.
 */
export function isPromotionActive(promotion: MarketplacePromotion, now = new Date()) {
  const timestamp = now.getTime();
  return promotion.isBannerEnabled !== false
    && timestamp >= new Date(promotion.startDate).getTime()
    && timestamp <= new Date(promotion.endDate).getTime();
}

export function getPromotionsForProduct(productId: string) {
  return currentMarketplacePromotions.filter((promotion) => getPromotionProductIds(promotion).includes(productId));
}

export function isPromotionVisibleOnHome(promotion: MarketplacePromotion) {
  return isPromotionActive(promotion) && (promotion.display === "home-banner" || promotion.display === "both");
}

export function isPromotionVisibleInList(promotion: MarketplacePromotion) {
  return isPromotionActive(promotion) && (promotion.display === "promotion-list" || promotion.display === "both");
}

export function getVisibleSupplierPromotions(supplierName: string) {
  return currentMarketplacePromotions.filter(
    (promotion) => promotion.supplierName === supplierName && isPromotionActive(promotion),
  );
}

export function getPricePromotion(productId: string, optionId?: string) {
  return getPromotionsForProduct(productId).find(
    (promotion) =>
      isPromotionActive(promotion)
      && (promotion.type === "FixedPrice" || promotion.type === "Percentage")
      && (!promotion.discountOptionKeys?.length || (optionId ? promotion.discountOptionKeys.includes(`${productId}:${optionId}`) : true)),
  );
}

export function getPromotionalPrice(product: PromotionProduct, option: PromotionSellingOption) {
  const promotion = getPricePromotion(product.id, option.id);
  if (!promotion) return { price: option.price, promotion: undefined };
  if (promotion.type === "FixedPrice" && promotion.fixedPrice !== undefined) {
    return { price: promotion.fixedPricesByOption?.[`${product.id}:${option.id}`] ?? promotion.fixedPrice, promotion };
  }
  if (promotion.type === "Percentage" && promotion.discountPercent !== undefined) {
    return { price: Math.round(option.price * (1 - promotion.discountPercent / 100)), promotion };
  }
  return { price: option.price, promotion: undefined };
}

export function getPromotionRewards(
  lines: PromotionCartLine[],
  selectedGiftProductIds: Record<string, string> = {},
): PromotionReward[] {
  return currentMarketplacePromotions.flatMap((promotion) => {
    if (!isPromotionActive(promotion)) return [];
    const giftChoices = getPromotionGiftChoices(promotion);
    // A gift is never guessed. The buyer must explicitly make the choice on
    // the qualifying product page before a free cart line can be created.
    const selectedChoice = giftChoices.find(
      (choice) => choice.productId === selectedGiftProductIds[promotion.id],
    );
    if (
      promotion.type !== "BuyXGetY" ||
      !promotion.buyQuantity ||
      !selectedChoice ||
      !promotion.giftQuantity
    ) return [];

    const paidTriggerQuantity = lines
      .filter((line) => line.product.id === promotion.productIds[0] && line.option.id === (promotion.triggerOptionId ?? promotion.giftOptionId))
      .reduce((total, line) => total + line.quantity, 0);
    // A BXGY reward is granted once per promotion in a cart. Paid trigger
    // quantities can continue to grow, but must not create extra free items.
    const quantity = paidTriggerQuantity >= promotion.buyQuantity
      ? Math.min(1, promotion.giftQuantity)
      : 0;

    return quantity > 0
      ? [{ promotion, productId: selectedChoice.productId, optionId: selectedChoice.optionId, quantity }]
      : [];
  });
}

/**
 * Revalidates promotional cart lines immediately before they are written to
 * IndexedDB. It deliberately does not trust the selection UI: the configured
 * product/option pair, paid quantity and supplier relationship are checked
 * again here.
 */
export function validatePromotionCart({
  lines,
  selectedGiftProductIds,
  horecaAccountId,
  now,
}: PromotionCartValidationInput): PromotionReward[] {
  const activeRewards = getPromotionRewards(lines, selectedGiftProductIds);

  for (const [promotionId, selectedGiftProductId] of Object.entries(selectedGiftProductIds)) {
    const promotion = currentMarketplacePromotions.find((item) => item.id === promotionId);
    if (!promotion || promotion.type !== "BuyXGetY") {
      throw new Error("This free-gift promotion is no longer available.");
    }
    if (!isPromotionActive(promotion, now)) {
      throw new Error(`“${promotion.title}” is no longer active.`);
    }
    if (promotion.eligibleHorecaAccountIds?.length && (!horecaAccountId || !promotion.eligibleHorecaAccountIds.includes(horecaAccountId))) {
      throw new Error("This promotion is not available to your company.");
    }

    const choice = getPromotionGiftChoices(promotion).find((item) => item.productId === selectedGiftProductId);
    if (!choice) {
      throw new Error("The selected free item is not part of this promotion.");
    }

    const paidQuantity = lines
      .filter((line) => line.product.id === promotion.productIds[0] && line.option.id === promotion.triggerOptionId)
      .reduce((total, line) => total + line.quantity, 0);
    if (paidQuantity < (promotion.buyQuantity ?? 0)) continue;

    const paidSupplier = lines.find(
      (line) => line.product.id === promotion.productIds[0] && line.option.id === promotion.triggerOptionId,
    )?.product.supplier;
    // Gift-product ownership is checked when the IndexedDB record is projected
    // into the marketplace. At submit time the paid product must still belong
    // to that same supplier; never trust the client-side gift label.
    if (!paidSupplier || paidSupplier !== promotion.supplierName) {
      throw new Error("The qualifying product and free item must belong to the promotion supplier.");
    }
  }

  return activeRewards;
}
