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

export const marketplaceProducts: MarketplaceProduct[] = [
  {
    id: "vine-tomatoes",
    title: "Vine-ripened tomatoes",
    price: 1_250,
    unit: "per kg",
    supplier: "Ararat Harvest",
    category: "Fresh produce",
    salePercentage: 10,
    sellingOptions: [
      { id: "single", quantity: 1, unitType: "kg", price: 1_250, minimumOrderQuantity: 2 },
      { id: "crate", quantity: 5, unitType: "kg crate", price: 5_750, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "olive-oil",
    title: "Extra virgin olive oil",
    price: 8_900,
    unit: "per 1 L bottle",
    supplier: "Mare & Terra",
    category: "Pantry",
    sellingOptions: [
      { id: "bottle", quantity: 1, unitType: "bottle (1 L)", price: 8_900, minimumOrderQuantity: 2 },
      { id: "case", quantity: 6, unitType: "bottles (1 L)", price: 50_400, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "feta",
    title: "Barrel-aged feta cheese",
    price: 4_600,
    unit: "per kg",
    supplier: "Lori Dairy Co.",
    category: "Dairy",
    salePercentage: 15,
    sellingOptions: [
      { id: "single", quantity: 1, unitType: "kg", price: 4_600, minimumOrderQuantity: 1 },
      { id: "wheel", quantity: 3, unitType: "kg wheel", price: 12_900, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1626957341926-98752fc2ba90?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "basil",
    title: "Sweet basil, bunch",
    price: 680,
    unit: "per bunch",
    supplier: "Ararat Harvest",
    category: "Herbs",
    salePercentage: 5,
    sellingOptions: [
      { id: "bunch", quantity: 1, unitType: "bunch", price: 680, minimumOrderQuantity: 3 },
      { id: "package", quantity: 1, unitType: "Package", piecesPerPackage: 12, price: 7_300, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "baby-gem-lettuce",
    title: "Baby gem lettuce",
    price: 1_450,
    unit: "per 6 heads",
    supplier: "Ararat Harvest",
    category: "Fresh produce",
    sellingOptions: [
      { id: "six-pack", quantity: 6, unitType: "heads", price: 1_450, minimumOrderQuantity: 2 },
      { id: "case", quantity: 24, unitType: "heads", price: 5_400, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1622205313162-be1d5712a43e?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "chicken",
    title: "Free-range chicken breast",
    price: 3_750,
    unit: "per kg",
    supplier: "Highland Poultry",
    category: "Meat & poultry",
    sellingOptions: [
      { id: "single", quantity: 1, unitType: "kg", price: 3_750, minimumOrderQuantity: 2 },
      { id: "case", quantity: 5, unitType: "kg case", price: 17_500, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "sourdough",
    title: "Country sourdough loaf",
    price: 1_100,
    unit: "per loaf",
    supplier: "Masis Bakehouse",
    category: "Bakery",
    sellingOptions: [
      { id: "loaf", quantity: 1, unitType: "loaf", price: 1_100, minimumOrderQuantity: 2 },
      { id: "crate", quantity: 10, unitType: "loaves", price: 9_900, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "mushrooms",
    title: "Brown button mushrooms",
    price: 2_200,
    unit: "per kg",
    supplier: "Greenhouse 27",
    category: "Fresh produce",
    salePercentage: 20,
    sellingOptions: [
      { id: "single", quantity: 1, unitType: "kg", price: 2_200, minimumOrderQuantity: 2 },
      { id: "case", quantity: 3, unitType: "kg case", price: 5_850, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "coffee",
    title: "House espresso beans",
    price: 6_400,
    unit: "per 1 kg bag",
    supplier: "Roast Republic",
    category: "Beverages",
    sellingOptions: [
      { id: "bag", quantity: 1, unitType: "bag (1 kg)", price: 6_400, minimumOrderQuantity: 2 },
      { id: "case", quantity: 6, unitType: "bags", price: 35_400, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "balsamic-vinegar",
    title: "Aged balsamic vinegar",
    price: 4_200,
    unit: "per 500 ml bottle",
    supplier: "Mare & Terra",
    category: "Pantry",
    sellingOptions: [
      { id: "bottle", quantity: 1, unitType: "bottle (500 ml)", price: 4_200, minimumOrderQuantity: 2 },
      { id: "case", quantity: 6, unitType: "bottles (500 ml)", price: 22_800, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1603046891744-76e6300e6e53?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "castelvetrano-olives",
    title: "Castelvetrano green olives",
    price: 3_600,
    unit: "per 500 g jar",
    supplier: "Mare & Terra",
    category: "Pantry",
    sellingOptions: [
      { id: "jar", quantity: 1, unitType: "jar (500 g)", price: 3_600, minimumOrderQuantity: 2 },
      { id: "case", quantity: 6, unitType: "jars (500 g)", price: 19_800, minimumOrderQuantity: 1 },
    ],
    image:
      "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?auto=format&fit=crop&w=900&q=85",
  },
];

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
