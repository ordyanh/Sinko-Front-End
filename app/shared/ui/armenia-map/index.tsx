import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  Crosshair,
  Layers,
  X,
  Loader2,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer } from "leaflet";
import { useTranslation } from "~/shared/lib/i18n";

export type Coordinates = {
  lat: number | null;
  lon: number | null;
};

export type SearchResult = {
  displayName: string;
  lat: number;
  lon: number;
  road?: string;
  houseNumber?: string;
  city?: string;
  suburb?: string;
};

export type ArmeniaMapPickerProps = {
  value?: Coordinates;
  onChange?: (coords: Coordinates) => void;
  onAddressResolved?: (address: string) => void;
  initialAddressQuery?: string;
  className?: string;
  height?: string | number;
};

// Default center: Yerevan Republic Square / Center
const YEREVAN_CENTER: [number, number] = [40.1792, 44.4991];
const ARMENIA_BOUNDS: [[number, number], [number, number]] = [
  [38.75, 43.35], // Southwest
  [41.45, 46.85], // Northeast
];

export default function ArmeniaMapPicker({
  value,
  onChange,
  onAddressResolved,
  initialAddressQuery = "",
  className = "",
  height = "430px", // 20%+ larger than previous 340-360px
}: ArmeniaMapPickerProps) {
  const { t, language } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const isInternalUpdateRef = useRef(false);

  const [coords, setCoords] = useState<Coordinates>({
    lat: value?.lat ?? null,
    lon: value?.lon ?? null,
  });

  const [isClient, setIsClient] = useState(false);
  const [mapType, setMapType] = useState<"google-roadmap" | "google-satellite">("google-roadmap");
  const [searchQuery, setSearchQuery] = useState(initialAddressQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create or update marker with SVG Pin
  const createOrUpdateMarker = useCallback(async (lat: number, lon: number) => {
    if (!mapInstanceRef.current) return;
    const L = await import("leaflet");

    const pinIcon = L.divIcon({
      className: "synco-map-pin",
      html: `
        <div style="position: relative; width: 40px; height: 48px; transform: translate(-20px, -48px); pointer-events: none;">
          <div style="
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            width: 14px;
            height: 5px;
            background: rgba(15, 23, 42, 0.35);
            border-radius: 50%;
            filter: blur(1.5px);
          "></div>
          <div style="
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.4), 0 4px 6px -4px rgba(225, 29, 72, 0.3);
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
              box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);
            "></div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      const newMarker = L.marker([lat, lon], {
        icon: pinIcon,
        draggable: true,
      }).addTo(mapInstanceRef.current);

      newMarker.on("dragend", () => {
        const latLng = newMarker.getLatLng();
        updateLocation(latLng.lat, latLng.lng, true);
      });

      markerRef.current = newMarker;
    }
  }, []);

  // Reverse geocoding helper (Armenia-targeted, supports Armenian / Russian / English)
  const reverseGeocode = useCallback(
    async (lat: number, lon: number) => {
      setIsReverseGeocoding(true);
      try {
        const langHeader = `${language},hy,ru,en`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${encodeURIComponent(langHeader)}`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data?.display_name) {
          const addr = data.address || {};
          const defaultCity = language === "hy" ? "Երևան" : language === "en" ? "Yerevan" : "Ереван";
          const city = addr.city || addr.town || addr.village || addr.municipality || defaultCity;
          const road = addr.road || addr.pedestrian || addr.suburb || "";
          const house = addr.house_number ? ` ${addr.house_number}` : "";

          let formatted = "";
          if (road) {
            formatted = `${city}, ${road}${house}`.trim();
          } else {
            formatted = data.display_name.split(",").slice(0, 3).join(",").trim();
          }

          if (onAddressResolved) {
            onAddressResolved(formatted);
          }
        }
      } catch (err) {
        console.warn("Reverse geocode notice:", err);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [language, onAddressResolved],
  );

  // Update coords and notify
  const updateLocation = useCallback(
    (lat: number, lon: number, triggerReverse = true) => {
      const roundedLat = parseFloat(lat.toFixed(6));
      const roundedLon = parseFloat(lon.toFixed(6));
      isInternalUpdateRef.current = true;
      setCoords({ lat: roundedLat, lon: roundedLon });
      onChange?.({ lat: roundedLat, lon: roundedLon });

      if (triggerReverse) {
        void reverseGeocode(roundedLat, roundedLon);
      }
    },
    [onChange, reverseGeocode],
  );

  // Sync state if external prop changes
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    if (value && (value.lat !== coords.lat || value.lon !== coords.lon)) {
      setCoords({ lat: value.lat, lon: value.lon });
      if (value.lat && value.lon && mapInstanceRef.current) {
        void createOrUpdateMarker(value.lat, value.lon);
        const currentZoom = mapInstanceRef.current.getZoom();
        const targetZoom = currentZoom < 15 ? 16 : currentZoom;
        mapInstanceRef.current.flyTo([value.lat, value.lon], targetZoom, { duration: 0.8 });
      }
    }
  }, [value?.lat, value?.lon, createOrUpdateMarker, coords.lat, coords.lon]);

  // Initialize Map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let isSubscribed = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initLeaflet() {
      const L = await import("leaflet");
      if (!isSubscribed || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = coords.lat || YEREVAN_CENTER[0];
      const initialLon = coords.lon || YEREVAN_CENTER[1];
      const initialZoom = coords.lat ? 16 : 13;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: initialZoom,
        minZoom: 7,
        maxZoom: 19,
        maxBounds: ARMENIA_BOUNDS,
        maxBoundsViscosity: 0.8,
        zoomControl: false,
      });

      // Google Maps Tile Layer
      const getTileUrl = (type: "google-roadmap" | "google-satellite") => {
        return type === "google-satellite"
          ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
      };

      const tileLayer = L.tileLayer(getTileUrl(mapType), {
        attribution: '&copy; Google Maps &copy; OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Click to pick point
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        void createOrUpdateMarker(lat, lng);
        updateLocation(lat, lng, true);
      });

      mapInstanceRef.current = map;

      if (coords.lat && coords.lon) {
        void createOrUpdateMarker(coords.lat, coords.lon);
      }

      // Auto-invalidate size on container resize / modal open
      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    }

    void initLeaflet();

    return () => {
      isSubscribed = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]);

  // Switch Google Maps Layer (Roadmap vs Satellite)
  const toggleMapLayer = useCallback(async () => {
    const nextType = mapType === "google-roadmap" ? "google-satellite" : "google-roadmap";
    setMapType(nextType);

    if (mapInstanceRef.current && tileLayerRef.current) {
      const L = await import("leaflet");
      mapInstanceRef.current.removeLayer(tileLayerRef.current);

      const url =
        nextType === "google-satellite"
          ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

      const newTileLayer = L.tileLayer(url, {
        attribution: '&copy; Google Maps &copy; OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(mapInstanceRef.current);

      tileLayerRef.current = newTileLayer;
    }
  }, [mapType]);

  // Locate User via Geolocation
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert(t("settings.geolocationNotSupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
        }
        void createOrUpdateMarker(latitude, longitude);
        updateLocation(latitude, longitude, true);
      },
      (err) => {
        console.warn("Geolocation notice:", err);
        alert(t("settings.geolocationFailed"));
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, [createOrUpdateMarker, t, updateLocation]);

  // Center on Yerevan
  const handleCenterYerevan = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(YEREVAN_CENTER, 14, { duration: 1 });
    }
  }, []);

  // Clear Marker
  const handleClearMarker = useCallback(() => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    isInternalUpdateRef.current = true;
    setCoords({ lat: null, lon: null });
    onChange?.({ lat: null, lon: null });
  }, [onChange]);

  // Search Address / Places in Armenia
  const handleSearchAddress = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setIsSearching(true);
      setShowResultsDropdown(true);

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
          setSearchResults([]);
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
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn("Address search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [language],
  );

  // Select Search Result
  const handleSelectResult = useCallback(
    async (result: SearchResult) => {
      setShowResultsDropdown(false);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([result.lat, result.lon], 16, { duration: 1.2 });
      }

      void createOrUpdateMarker(result.lat, result.lon);
      updateLocation(result.lat, result.lon, false);

      const defaultCity = language === "hy" ? "Երևան" : language === "en" ? "Yerevan" : "Ереван";
      const city = result.city || defaultCity;
      const road = result.road || result.suburb || "";
      const house = result.houseNumber ? ` ${result.houseNumber}` : "";
      const cleaned = road
        ? `${city}, ${road}${house}`.trim()
        : result.displayName.split(",").slice(0, 3).join(",").trim();

      setSearchQuery(cleaned);
      if (onAddressResolved) {
        onAddressResolved(cleaned);
      }
    },
    [createOrUpdateMarker, language, onAddressResolved, updateLocation],
  );

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-slate-200 bg-slate-900/5 shadow-sm overflow-hidden ${className}`}
    >
      {/* Map Search Bar Floating on top */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <div className="relative flex items-center shadow-lg rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-900 transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
          <div className="pl-3 text-slate-400">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 2) {
                void handleSearchAddress(e.target.value);
              } else {
                setShowResultsDropdown(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSearchAddress(searchQuery);
              }
            }}
            placeholder={t("settings.searchAddressPlaceholder")}
            className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowResultsDropdown(false);
              }}
              className="mr-1.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label={t("settings.clearSearch")}
              title={t("settings.clearSearch")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSearchAddress(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            className="m-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-50 transition"
          >
            {t("settings.findButton")}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showResultsDropdown && (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-1 shadow-2xl">
            {searchResults.length > 0 ? (
              searchResults.map((item, idx) => (
                <button
                  key={`${item.lat}-${item.lon}-${idx}`}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full flex items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition"
                >
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="line-clamp-2 leading-snug">{item.displayName}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2.5 text-center text-xs text-slate-400">
                {isSearching ? t("settings.searchingAddresses") : t("settings.noAddressesFound")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Controls on Top Right */}
      <div className="absolute right-3 top-16 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleLocateMe}
          title={t("settings.myLocation")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition hover:bg-slate-50 hover:text-primary active:scale-95"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleCenterYerevan}
          title={t("settings.centerCapital")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition hover:bg-slate-50 hover:text-primary active:scale-95"
        >
          <Navigation className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleMapLayer}
          title={
            mapType === "google-roadmap"
              ? t("settings.toggleSatellite")
              : t("settings.toggleRoadmap")
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition hover:bg-slate-50 hover:text-primary active:scale-95"
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      {/* Map DOM Container */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full z-0 bg-slate-100 cursor-crosshair"
      />

      {/* Footer Info & Coordinate Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {coords.lat && coords.lon ? (
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                {t("settings.coordinatesLabel")}{" "}
                <strong className="font-mono text-slate-800">
                  {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                </strong>
              </span>
              {isReverseGeocoding && (
                <span className="inline-flex items-center text-[10px] text-slate-400">
                  <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
                  {t("settings.resolvingAddress")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{t("settings.clickMapOrSearchPrompt")}</span>
            </div>
          )}
        </div>

        {coords.lat && coords.lon && (
          <button
            type="button"
            onClick={handleClearMarker}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition"
          >
            {t("settings.resetPoint")}
          </button>
        )}
      </div>
    </div>
  );
}
