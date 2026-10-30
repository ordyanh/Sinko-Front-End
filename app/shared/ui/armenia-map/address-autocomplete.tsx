import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { useTranslation } from "~/shared/lib/i18n";
import type { Coordinates, SearchResult } from "./index";

export type AddressAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (address: string, coords: Coordinates) => void;
  label?: React.ReactNode;
  placeholder?: string;
  errorMessage?: string;
  hint?: string;
  disabled?: boolean;
};

export default function AddressAutocomplete({
  id = "deliveryAddressFullAddress",
  value,
  onChange,
  onSelectAddress,
  label,
  placeholder,
  errorMessage,
  hint,
  disabled = false,
}: AddressAutocompleteProps) {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search logic for Armenia addresses
  const searchAddress = useCallback(
    async (queryText: string) => {
      const trimmed = queryText.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const langParam = `${language},hy,ru,en`;
        const hasArmenia =
          trimmed.toLowerCase().includes("armenia") ||
          trimmed.toLowerCase().includes("ереван") ||
          trimmed.toLowerCase().includes("yerevan") ||
          trimmed.toLowerCase().includes("հայաստան");

        const searchQueryParam = hasArmenia ? trimmed : `${trimmed}, Armenia`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQueryParam,
        )}&format=json&addressdetails=1&limit=6&countrycodes=am&accept-language=${encodeURIComponent(
          langParam,
        )}`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const results: SearchResult[] = data.map((item: any) => ({
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            road: item.address?.road || item.address?.pedestrian,
            houseNumber: item.address?.house_number,
            city: item.address?.city || item.address?.town || item.address?.village,
            suburb: item.address?.suburb,
          }));
          setSuggestions(results);
          setIsOpen(true);
        } else {
          setSuggestions([]);
          setIsOpen(true); // to show 'no results'
        }
      } catch (err) {
        console.warn("Autocomplete error:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [language],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        void searchAddress(text);
      }, 250);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (item: SearchResult) => {
    const defaultCity = language === "hy" ? "Երևան" : language === "en" ? "Yerevan" : "Ереван";
    const city = item.city || defaultCity;
    const road = item.road || item.suburb || "";
    const house = item.houseNumber ? ` ${item.houseNumber}` : "";
    const formatted = road
      ? `${city}, ${road}${house}`.trim()
      : item.displayName.split(",").slice(0, 3).join(",").trim();

    onSelectAddress(formatted, {
      lat: parseFloat(item.lat.toFixed(6)),
      lon: parseFloat(item.lon.toFixed(6)),
    });

    setIsOpen(false);
    setSuggestions([]);
  };

  const isInvalid = Boolean(errorMessage);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          placeholder={placeholder || t("settings.fullAddressPlaceholder")}
          autoComplete="off"
          className={`h-11 w-full rounded-xl border bg-white px-3.5 pr-10 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${
            isInvalid
              ? "border-red-400 bg-red-50/40 text-red-950 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50 dark:bg-red-950/20 dark:text-red-200"
              : "border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-primary/20 dark:hover:border-slate-600"
          }`}
        />

        <div className="absolute right-3 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {!isLoading && value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {hint && !errorMessage && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{hint}</p>
      )}

      {errorMessage && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">{errorMessage}</p>
      )}

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[1100] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white/98 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 dark:border-slate-700 dark:bg-slate-900/98">
          {suggestions.length > 0 ? (
            suggestions.map((item, idx) => {
              const mainTitle = item.road
                ? `${item.road}${item.houseNumber ? ` ${item.houseNumber}` : ""}`
                : item.displayName.split(",")[0];
              const subTitle = [item.suburb, item.city].filter(Boolean).join(", ") || item.displayName;

              return (
                <button
                  key={`${item.lat}-${item.lon}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition group dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition dark:bg-rose-950/40 dark:text-rose-400">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-900 group-hover:text-primary truncate dark:text-slate-100">
                      {mainTitle}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate dark:text-slate-400">
                      {subTitle}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-400">
              {isLoading ? t("settings.searchingAddresses") : t("settings.noAddressesFound")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
