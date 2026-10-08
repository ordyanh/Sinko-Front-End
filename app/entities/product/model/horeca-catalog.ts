import {
  getMarketplaceProducts,
  type MarketplaceProductDto,
  type MarketplaceProductFilter,
} from "~/shared/api/marketplace";
import type { MarketplaceProduct, MarketplaceSellingOption } from "./product";

export function mapBackendMarketplaceProduct(p: MarketplaceProductDto): MarketplaceProduct {
  const defaultPrice = p.price ?? 0;
  const unitLabel = p.unitDisplay || p.unit || "unit";

  let sellingOptions: MarketplaceSellingOption[] = [];
  if (Array.isArray(p.packageOptions) && p.packageOptions.length > 0) {
    sellingOptions = p.packageOptions.map((pkgQty) => ({
      id: `opt-${p.productId}-${pkgQty}`,
      quantity: pkgQty,
      unitType: pkgQty > 1 ? `Package (${pkgQty} ${unitLabel})` : unitLabel,
      piecesPerPackage: pkgQty > 1 ? pkgQty : undefined,
      price: defaultPrice * pkgQty,
      minimumOrderQuantity: 1,
    }));
  } else {
    sellingOptions = [
      {
        id: `opt-${p.productId}`,
        quantity: 1,
        unitType: unitLabel,
        price: defaultPrice,
        minimumOrderQuantity: 1,
      },
    ];
  }

  return {
    id: String(p.productId),
    supplierId: p.supplierId || "SUP-3001",
    title: p.productName || p.code || `Product ${p.productId}`,
    price: defaultPrice,
    unit: unitLabel,
    supplier: p.supplierName || "Direct Supplier",
    category: p.categoryName || "General",
    image: p.imageUrl || "",
    sellingOptions,
  };
}

/** Builds the purchasable catalog for the currently signed-in HORECA account. */
export async function getHorecaMarketplaceProducts(
  filter?: MarketplaceProductFilter,
): Promise<MarketplaceProduct[]> {
  try {
    const backendProducts = await getMarketplaceProducts(filter);
    if (Array.isArray(backendProducts) && backendProducts.length > 0) {
      return backendProducts.map(mapBackendMarketplaceProduct);
    }
  } catch (err) {
    console.error("Failed to load products from marketplace API:", err);
  }

  return [];
}
