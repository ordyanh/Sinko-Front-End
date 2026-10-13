export type MarketplaceProduct = {
  id: string;
  supplierId?: string;
  title: string;
  price: number;
  unit: string;
  supplier: string;
  category: string;
  image: string;
  salePercentage?: number;
  sellingOptions?: MarketplaceSellingOption[];
};

export type MarketplaceSellingOption = {
  id: string;
  quantity: number;
  unitType: string;
  /** Individual pieces in one package. Present only when unitType is Package. */
  piecesPerPackage?: number;
  price: number;
  /** Minimum number of this selling unit a buyer may order. */
  minimumOrderQuantity: number;
};

export type MarketplaceCartLine = {
  product: MarketplaceProduct;
  option: MarketplaceSellingOption;
  quantity: number;
};

export type MarketplaceCartSupplierGroup = {
  supplier: string;
  lines: MarketplaceCartLine[];
  itemCount: number;
  total: number;
};

export const marketplaceProducts: MarketplaceProduct[] = [];

export function formatMarketplacePrice(value: number) {
  const num = typeof value === "number" && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat("en-US").format(num) + " դրամ";
}

export function hasMarketplaceSale(product: MarketplaceProduct) {
  return (product?.salePercentage ?? 0) >= 5;
}

export function getMarketplaceProductPrice(product: MarketplaceProduct) {
  const options = getMarketplaceSellingOptions(product);
  if (!options || options.length === 0) return product?.price ?? 0;
  return getMarketplaceSellingOptionPrice(product, options[0]);
}

export function getMarketplaceSellingOptions(product: MarketplaceProduct): MarketplaceSellingOption[] {
  if (product?.sellingOptions?.length) {
    return product.sellingOptions;
  }
  const rawUnit = typeof product?.unit === "string" ? product.unit : "unit";
  return [
    {
      id: "default",
      quantity: 1,
      unitType: rawUnit.replace(/^per /, ""),
      price: product?.price ?? 0,
      minimumOrderQuantity: 1,
    },
  ];
}

export function getMarketplaceOptionLabel(option?: MarketplaceSellingOption): string {
  if (!option) return "";
  const packageQuantity =
    option.unitType === "Package" && option.piecesPerPackage
      ? ` (${option.piecesPerPackage} pcs)`
      : "";
  return `${option.quantity ?? 1} ${option.unitType ?? "unit"}${packageQuantity}`;
}

export function getMarketplaceMinimumOrderLabel(option?: MarketplaceSellingOption): string {
  if (!option) return "Min. 1 unit";
  const minimum = option.minimumOrderQuantity ?? 1;
  return `Min. ${minimum} ${minimum === 1 ? "unit" : "units"}`;
}

export function getMarketplaceSellingOptionPrice(
  product: MarketplaceProduct,
  option?: MarketplaceSellingOption,
): number {
  if (!option) return product?.price ?? 0;
  if (!hasMarketplaceSale(product)) return option.price ?? 0;

  return Math.round((option.price ?? 0) * (1 - (product?.salePercentage ?? 0) / 100));
}

export function groupMarketplaceCartLinesBySupplier(
  lines: MarketplaceCartLine[],
) {
  return lines.reduce<MarketplaceCartSupplierGroup[]>((groups, line) => {
    const group = groups.find(
      ({ supplier }) => supplier === line.product.supplier,
    );
    const lineTotal =
      getMarketplaceSellingOptionPrice(line.product, line.option) * line.quantity;

    if (group) {
      group.lines.push(line);
      group.itemCount += line.quantity;
      group.total += lineTotal;
      return groups;
    }

    groups.push({
      supplier: line.product.supplier,
      lines: [line],
      itemCount: line.quantity,
      total: lineTotal,
    });
    return groups;
  }, []);
}
