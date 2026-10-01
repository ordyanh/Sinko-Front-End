import { useEffect } from "react";
import { useFetcher } from "react-router";
import type { DictionaryCategoryOption } from "../model/dictonary";

type CategoriesResponse =
  | { ok: true; categories: DictionaryCategoryOption[] }
  | { ok: false; error: string };

export function useCategories(langId = 2) {
  const fetcher = useFetcher<CategoriesResponse>();

  useEffect(() => {
    if (fetcher.state !== "idle" || fetcher.data) {
      return;
    }

    fetcher.load(`/api/categories?langId=${encodeURIComponent(langId)}`);
  }, [fetcher, fetcher.data, fetcher.state, langId]);

  const response = fetcher.data;

  return {
    categories: response?.ok ? response.categories : [],
    error: response && !response.ok ? response.error : null,
    isLoading: fetcher.state !== "idle",
  };
}
