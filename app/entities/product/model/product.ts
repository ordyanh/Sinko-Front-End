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
  return new Intl.NumberFormat("en-US").format(value) + " դրամ";
}

export function hasMarketplaceSale(product: MarketplaceProduct) {
  return (product.salePercentage ?? 0) >= 5;
}

export function getMarketplaceProductPrice(product: MarketplaceProduct) {
  return getMarketplaceSellingOptionPrice(
    product,
    getMarketplaceSellingOptions(product)[0],
  );
}

export function getMarketplaceSellingOptions(product: MarketplaceProduct) {
  return product.sellingOptions?.length
    ? product.sellingOptions
    : [
        {
          id: "default",
          quantity: 1,
          unitType: product.unit.replace(/^per /, ""),
          price: product.price,
          minimumOrderQuantity: 1,
        },
      ];
}

export function getMarketplaceOptionLabel(option: MarketplaceSellingOption) {
  const packageQuantity =
    option.unitType === "Package" && option.piecesPerPackage
      ? ` (${option.piecesPerPackage} pcs)`
      : "";
  return `${option.quantity} ${option.unitType}${packageQuantity}`;
}

export function getMarketplaceMinimumOrderLabel(option: MarketplaceSellingOption) {
  const minimum = option.minimumOrderQuantity;
  return `Min. ${minimum} ${minimum === 1 ? "unit" : "units"}`;
}

export function getMarketplaceSellingOptionPrice(
  product: MarketplaceProduct,
  option: MarketplaceSellingOption,
) {
  if (!hasMarketplaceSale(product)) return option.price;

  return Math.round(option.price * (1 - (product.salePercentage ?? 0) / 100));
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
