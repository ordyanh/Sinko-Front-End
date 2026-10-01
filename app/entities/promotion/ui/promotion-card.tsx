import { ArrowUpRight, CalendarDays, Gift, Tag } from "lucide-react";
import { Link } from "react-router";
import { promotionTypeLabels, type MarketplacePromotion } from "../model/promotion";

const toneClasses: Record<MarketplacePromotion["tone"], { surface: string; halo: string; chip: string }> = {
  green: { surface: "from-[#194d37] to-[#2f7751]", halo: "bg-[#a6d9ae]/30", chip: "bg-[#dcefe0] text-[#245b3c]" },
  gold: { surface: "from-[#8e5709] to-[#c18517]", halo: "bg-[#ffe5a7]/35", chip: "bg-[#fff0c7] text-[#855206]" },
  violet: { surface: "from-[#4f3a79] to-[#765ba7]", halo: "bg-[#dfd4ff]/35", chip: "bg-[#eee9fa] text-[#584281]" },
  coral: { surface: "from-[#923d2d] to-[#c85d47]", halo: "bg-[#ffd0c3]/35", chip: "bg-[#fae5df] text-[#97402f]" },
};

function formatEndDate(date: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(date));
}

/**
 * The marketplace discovery banner shared by live promotion cards and the
 * supplier's draft preview. It intentionally has no navigation or mutation.
 */
export function PromotionBanner({
  promotion,
  interactive = false,
}: {
  promotion: MarketplacePromotion;
  interactive?: boolean;
}) {
  const tone = toneClasses[promotion.tone];

  return (
    <div className={`group relative min-h-56 overflow-hidden rounded-[1.5rem] bg-gradient-to-br p-5 text-white shadow-[0_12px_30px_rgba(15,23,42,0.10)] ${interactive ? "transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_38px_rgba(15,23,42,0.16)]" : ""} ${tone.surface}`}>
      {promotion.visualUrl ? <><img src={promotion.visualUrl} alt="" className={`absolute inset-0 h-full w-full object-cover ${interactive ? "transition duration-500 group-hover:scale-105" : ""}`} /><span className="absolute inset-0 bg-gradient-to-br from-slate-950/75 via-slate-950/35 to-slate-950/55" aria-hidden="true" /></> : null}
      <span className={`absolute -right-12 -top-14 h-44 w-44 rounded-full blur-2xl ${tone.halo}`} aria-hidden="true" />
      <span className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full border-[18px] border-white/10" aria-hidden="true" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3"><span className="max-w-[70%] text-xs font-bold uppercase tracking-[0.15em] text-white/70">{promotion.supplierName}</span><ArrowUpRight className={`h-5 w-5 shrink-0 text-white/80 ${interactive ? "transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" : ""}`} aria-hidden="true" /></div>
        <div className="mt-auto pt-8"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.chip}`}><Tag className="h-3.5 w-3.5" aria-hidden="true" />{promotionTypeLabels[promotion.type]}</span><h2 className="mt-3 text-xl font-bold leading-tight tracking-[-0.04em]">{promotion.title}</h2><p className="mt-2 text-2xl font-extrabold leading-none tracking-[-0.055em]">{promotion.benefitLabel}</p><p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/75"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Ends {formatEndDate(promotion.endDate)}{promotion.type === "BuyXGetY" ? <><span aria-hidden="true">·</span><Gift className="h-3.5 w-3.5" aria-hidden="true" />Gift included</> : null}</p></div>
      </div>
    </div>
  );
}

/** A discovery banner: benefit first; the full rule lives on the offer detail page. */
export function PromotionCard({ promotion }: { promotion: MarketplacePromotion }) {
  return (
    <Link to={`/horeca/promotions/${promotion.id}`} className="block rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <PromotionBanner promotion={promotion} interactive />
    </Link>
  );
}
