export type MarketplaceSupplier = {
  id: string;
  name: string;
  initials: string;
  logoClassName: string;
  accentClassName: string;
  categories: string[];
  serviceArea: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  deliveryWindow: string;
  deliveryNote: string;
  orderSupplierId?: string;
};

export const marketplaceSuppliers: MarketplaceSupplier[] = [];

export function getMarketplaceSupplierById(supplierId: string) {
  return marketplaceSuppliers.find((supplier) => supplier.id === supplierId);
}
