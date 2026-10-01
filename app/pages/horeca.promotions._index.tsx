import { Tag } from "lucide-react";
import { useOutletContext } from "react-router";
import { isPromotionVisibleInList, PromotionCard, type MarketplacePromotion } from "~/entities/promotion";
import { DashboardPageContent } from "~/shared/ui";

export default function HorecaPromotionsPage() {
  const { promotions } = useOutletContext<{ promotions: MarketplacePromotion[] }>();
  const listedPromotions = promotions.filter(isPromotionVisibleInList);

  return (
    <DashboardPageContent className="max-w-[88rem]">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#fffefa] shadow-sm">
        <header className="border-b border-[#e5e9e2] bg-[#f5f8f2] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Tag className="h-4 w-4" aria-hidden="true" />Supplier offers</div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-4xl">Promotions worth planning around.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Open an offer to review its products, conditions, quantities, and validity before adding it to an order.</p>
        </header>

        <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-600"><span className="font-bold text-slate-950 tabular-nums">{listedPromotions.length}</span> offers available</p>
            <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">Updated for this week</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listedPromotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
          </div>
        </div>
      </section>
    </DashboardPageContent>
  );
}
