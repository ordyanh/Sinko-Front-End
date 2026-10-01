import { useEffect } from "react";
import { useFetcher } from "react-router";
import type { DictionaryRegionOption } from "../model/dictonary";

type RegionsResponse =
  | { ok: true; regions: DictionaryRegionOption[] }
  | { ok: false; error: string };

export function useRegions(langId = 1) {
  const fetcher = useFetcher<RegionsResponse>();

  useEffect(() => {
    if (fetcher.state !== "idle" || fetcher.data) {
      return;
    }

    fetcher.load(`/api/regions?langId=${encodeURIComponent(langId)}`);
  }, [fetcher, fetcher.data, fetcher.state, langId]);

  const response = fetcher.data;

  return {
    regions: response?.ok ? response.regions : [],
    error: response && !response.ok ? response.error : null,
    isLoading: fetcher.state !== "idle",
  };
}
