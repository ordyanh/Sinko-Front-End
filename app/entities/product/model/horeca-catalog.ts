import {
  getLoggedInUser,
  getSupplierCategories,
  getSupplierProducts,
  getSupplierUsers,
} from "~/shared/lib/indexed-db";
import type { MarketplaceProduct } from "./product";

/** Builds the purchasable catalog for the currently signed-in HORECA account. */
export async function getHorecaMarketplaceProducts(): Promise<MarketplaceProduct[]> {
  const customer = await getLoggedInUser();
  if (!customer || customer.role !== "horeca") return [];

  const suppliers = await getSupplierUsers();
  const catalogBySupplier = await Promise.all(
    suppliers.map(async (supplier) => {
      const [supplierProducts, categories] = await Promise.all([
        getSupplierProducts(supplier.id),
        getSupplierCategories(supplier.id),
      ]);
      const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

      return supplierProducts
        .filter((product) => product.status === "Active")
        .map<MarketplaceProduct>((product) => {
          const sellingOptions = product.sellingOptions.map((option) => ({
            id: option.id,
            quantity: option.quantity,
            unitType: option.customUnit?.trim() || option.unitType,
            piecesPerPackage: option.piecesPerPackage,
            price: option.companyPrices.find((price) => price.resourceId === customer.id)
              ?.individualPrice ?? option.price,
            minimumOrderQuantity: option.minimumOrderQuantity,
          }));

          return {
            id: product.id,
            supplierId: supplier.id,
            title: product.name,
            price: sellingOptions[0]?.price ?? 0,
            unit: sellingOptions[0]?.unitType ?? "unit",
            supplier: supplier.companyName,
            category: product.categoryIds
              .map((categoryId) => categoryNames.get(categoryId))
              .filter((category): category is string => Boolean(category))
              .join(", ") || "Uncategorized",
            image: product.imageUrl || "/favicon.ico",
            sellingOptions,
          };
        });
    }),
  );

  return catalogBySupplier.flat();
}
