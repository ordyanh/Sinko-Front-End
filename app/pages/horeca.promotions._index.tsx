import { useEffect, useState } from "react";
import { Sparkles, Tag } from "lucide-react";
import { useOutletContext } from "react-router";
import {
  getHorecaMarketplacePromotions,
  isPromotionVisibleInList,
  PromotionCard,
  type MarketplacePromotion,
} from "~/entities/promotion";
import { DashboardPageContent } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

export default function HorecaPromotionsPage() {
  const { t } = useTranslation();
  const outletCtx = useOutletContext<{ promotions?: MarketplacePromotion[] }>() ?? {};
  const [promotionsList, setPromotionsList] = useState<MarketplacePromotion[]>(
    outletCtx.promotions ?? [],
  );
  const [selectedType, setSelectedType] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(!outletCtx.promotions?.length);

  useEffect(() => {
    let isActive = true;

    async function loadPromos() {
      try {
        const promos = await getHorecaMarketplacePromotions();
        if (isActive) {
          setPromotionsList(promos);
        }
      } catch (err) {
        console.warn("Failed to load promotions:", err);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    if (!outletCtx.promotions || outletCtx.promotions.length === 0) {
      void loadPromos();
    } else {
      setPromotionsList(outletCtx.promotions);
      setIsLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [outletCtx.promotions]);

  const allListedPromotions = promotionsList.filter(isPromotionVisibleInList);
  const listedPromotions =
    selectedType === "All"
      ? allListedPromotions
      : allListedPromotions.filter((p) => p.type === selectedType);

  const promoFilterTabs = [
    { id: "All", label: t("common.all"), count: allListedPromotions.length },
    {
      id: "BuyXGetY",
      label: `🎁 ${t("products.buyXGetY")}`,
      count: allListedPromotions.filter((p) => p.type === "BuyXGetY").length,
    },
    {
      id: "Percentage",
      label: "🏷 %",
      count: allListedPromotions.filter((p) => p.type === "Percentage").length,
    },
    {
      id: "FixedPrice",
      label: "💰 ֏",
      count: allListedPromotions.filter((p) => p.type === "FixedPrice").length,
    },
  ];

  return (
    <DashboardPageContent className="max-w-[88rem]">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#fffefa] shadow-sm">
        <header className="border-b border-[#e5e9e2] bg-[#f5f8f2] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Tag className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.supplierPromotions")}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-4xl">
            {t("promotions.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {t("promotions.subtitle")}
          </p>
        </header>

        <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {promoFilterTabs.map((tab) => {
                const active = selectedType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedType(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? "border-primary bg-primary text-primary-content shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        active ? "bg-white/20 text-primary-content" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm font-medium text-slate-600">
              <span className="font-bold text-slate-950 tabular-nums">
                {isLoading ? "..." : listedPromotions.length}
              </span>{" "}
              {t("nav.promotions")}
            </p>
          </div>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
              {t("common.loading", "Loading...")}
            </div>
          ) : listedPromotions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {listedPromotions.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-900">
                {t("promotions.noPromotionsAvailable", "No active promotions available right now.")}
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {t("promotions.checkBackSoon", "Check back soon for new supplier offers and discounts.")}
              </p>
            </div>
          )}
        </div>
      </section>
    </DashboardPageContent>
  );
}
