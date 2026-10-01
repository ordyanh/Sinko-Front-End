import type { StoredSupplierCategory, StoredSupplierProfile } from "../model";

const supplierAccountId = "supplier-ararat-harvest";

export const initialSupplierCategories: readonly StoredSupplierCategory[] = [
  "Fresh Produce",
  "Herbs",
  "Fruits",
  "Pantry",
  "Dairy",
  "Bakery",
  "Beverages",
  "Meat & Poultry",
  "Seafood",
  "Frozen",
].map((name, index) => ({
  id: `supplier-category-${index + 1}`,
  accountId: supplierAccountId,
  name,
})).concat([
  { id: "mare-terra-pantry", accountId: "supplier-mare-terra", name: "Pantry" },
]);

export const initialSupplierProfiles: readonly StoredSupplierProfile[] = [
  {
    accountId: supplierAccountId,
    categoryIds: [
      "supplier-category-1",
      "supplier-category-2",
      "supplier-category-3",
    ],
    description:
      "Farm-picked produce and pantry essentials for professional kitchens across Yerevan.",
  },
  {
    accountId: "supplier-mare-terra",
    categoryIds: ["mare-terra-pantry"],
    description: "Mediterranean oils, vinegars, olives, and pantry staples for professional kitchens.",
  },
];
