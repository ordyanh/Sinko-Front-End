import {
  getMarketplaceProducts,
  type MarketplaceProductDto,
  type MarketplaceProductFilter,
} from "~/shared/api/marketplace";
import type { MarketplaceProduct, MarketplaceSellingOption } from "./product";
import { getAllActiveSupplierProducts } from "~/shared/lib/indexed-db";

export function mapBackendMarketplaceProduct(p: MarketplaceProductDto): MarketplaceProduct {
  const defaultPrice = p.price ?? (p as any).standardPrice ?? 0;
  const unitLabel = p.unitDisplay || p.unit || (p as any).sellingUnit || "unit";
  const pid = p.productId ?? (p as any).id ?? "";

  let packageOptions: number[] = [];
  if (Array.isArray(p.packageOptions)) {
    packageOptions = p.packageOptions
      .map((v) => Number(v))
      .filter((v) => !isNaN(v) && v > 0);
  } else if (typeof p.packageOptions === "string" && p.packageOptions.trim()) {
    packageOptions = p.packageOptions
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v) && v > 0);
  } else if (typeof p.packageOptions === "number" && p.packageOptions > 0) {
    packageOptions = [p.packageOptions];
  }

  let sellingOptions: MarketplaceSellingOption[] = [];
  if (packageOptions.length > 0) {
    sellingOptions = packageOptions.map((pkgQty) => ({
      id: `opt-${pid}-${pkgQty}`,
      quantity: pkgQty,
      unitType: pkgQty > 1 ? `Package (${pkgQty} ${unitLabel})` : unitLabel,
      piecesPerPackage: pkgQty > 1 ? pkgQty : undefined,
      price: defaultPrice * pkgQty,
      minimumOrderQuantity: 1,
    }));
  } else {
    sellingOptions = [
      {
        id: `opt-${pid}`,
        quantity: 1,
        unitType: unitLabel,
        price: defaultPrice,
        minimumOrderQuantity: 1,
      },
    ];
  }

  return {
    id: String(pid),
    supplierId: p.supplierId || "SUP-3001",
    title: p.productName || (p as any).name || p.code || `Product ${pid}`,
    price: defaultPrice,
    unit: unitLabel,
    supplier: p.supplierName || (p as any).supplier || "Direct Supplier",
    category: p.categoryName || (p as any).category || "General",
    image: p.imageUrl || (p as any).image || "",
    sellingOptions,
  };
}

/** Builds the purchasable catalog for the currently signed-in HORECA account. */
export async function getHorecaMarketplaceProducts(
  filter?: MarketplaceProductFilter,
): Promise<MarketplaceProduct[]> {
  let backendProducts: MarketplaceProductDto[] = [];
  try {
    backendProducts = await getMarketplaceProducts(filter);
  } catch (err) {
    console.error("Failed to load products from marketplace API:", err);
  }

  const results: MarketplaceProduct[] = Array.isArray(backendProducts) && backendProducts.length > 0
    ? backendProducts.map(mapBackendMarketplaceProduct)
    : [];

  const existingIds = new Set(results.map((p) => String(p.id)));

  try {
    const localActive = await getAllActiveSupplierProducts();
    for (const local of localActive) {
      if (!existingIds.has(String(local.id))) {
        const defaultPrice = (local.sellingOptions && local.sellingOptions[0]?.price) ?? 0;
        const firstOpt = local.sellingOptions?.[0];
        const unitLabel = firstOpt?.customUnit || firstOpt?.unitType || "unit";

        const sellingOptions: MarketplaceSellingOption[] = (local.sellingOptions || []).map((opt) => ({
          id: opt.id,
          quantity: opt.quantity,
          unitType: opt.customUnit || opt.unitType,
          piecesPerPackage: opt.piecesPerPackage,
          price: opt.price,
          minimumOrderQuantity: opt.minimumOrderQuantity || 1,
        }));

        results.push({
          id: String(local.id),
          supplierId: local.accountId || "supplier",
          title: local.name,
          price: defaultPrice,
          unit: unitLabel,
          supplier: "Direct Supplier",
          category: local.categoryIds && local.categoryIds.length > 0 ? local.categoryIds.join(", ") : "General",
          image: local.imageUrl || "",
          sellingOptions: sellingOptions.length > 0 ? sellingOptions : [
            {
              id: `opt-${local.id}`,
              quantity: 1,
              unitType: unitLabel,
              price: defaultPrice,
              minimumOrderQuantity: 1,
            },
          ],
        });
      }
    }
  } catch (err) {
    console.warn("Failed to merge local active products:", err);
  }

  return results;
}
