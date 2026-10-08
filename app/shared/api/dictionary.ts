import { apiRequest } from "./http";
import {
  extractDictionaryItems,
  toDictionaryCategoryOption,
  toDictionaryRegionOption,
  type DictionaryCategoryOption,
  type DictionaryRegionOption,
} from "~/entities/dictonary";

export type { DictionaryCategoryOption, DictionaryRegionOption };

export type DictionaryUnitOption = {
  id: number;
  code: string;
  name: string;
  symbol: string;
};

const DEFAULT_CATEGORIES: DictionaryCategoryOption[] = [
  { id: 1, name: "Dairy Products (Կաթնամթերք)" },
  { id: 2, name: "Meat & Poultry (Միս և թռչնամիս)" },
  { id: 3, name: "Produce & Vegetables (Բանջարեղեն և մրգեր)" },
  { id: 4, name: "Beverages & Drinks (Խմիչքներ)" },
  { id: 5, name: "Bakery & Pastry (Հացաբուլկեղեն)" },
  { id: 6, name: "Groceries & Spices (Նպարեղեն և համեմունքներ)" },
  { id: 7, name: "Frozen Foods (Սառեցված սնունդ)" },
  { id: 8, name: "Packaging & Supplies (Փաթեթավորում)" },
];

export async function getDictionaryCategories(langId = 2): Promise<DictionaryCategoryOption[]> {
  try {
    const query = new URLSearchParams({ langId: String(langId) });
    const payload = await apiRequest<unknown>(
      `/api/Dictionary/categories?${query.toString()}`,
    );

    const categories = extractDictionaryItems(payload)
      .map(toDictionaryCategoryOption)
      .filter((option): option is DictionaryCategoryOption => Boolean(option));

    return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function getDictionaryRegions(langId = 1): Promise<DictionaryRegionOption[]> {
  const query = new URLSearchParams({ langId: String(langId) });
  const payload = await apiRequest<unknown>(
    `/api/Dictionary/regions?${query.toString()}`,
  );

  const regions = extractDictionaryItems(payload)
    .map(toDictionaryRegionOption)
    .filter((option): option is DictionaryRegionOption => Boolean(option));

  return regions;
}

export async function getDictionaryUnits(): Promise<DictionaryUnitOption[]> {
  const res = await apiRequest<DictionaryUnitOption[]>("/api/Dictionary/units", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function getDictionarySellingUnits(): Promise<DictionaryUnitOption[]> {
  const res = await apiRequest<DictionaryUnitOption[]>("/api/Dictionary/selling-units", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function createCustomRegion(name: string): Promise<unknown> {
  const query = new URLSearchParams({ name });
  return apiRequest<unknown>(`/api/Dictionary/custom-region?${query.toString()}`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function createCustomCategory(name: string): Promise<unknown> {
  const query = new URLSearchParams({ name });
  return apiRequest<unknown>(`/api/Dictionary/custom-category?${query.toString()}`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
