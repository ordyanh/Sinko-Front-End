import { ArrowUpRight, CalendarDays, Gift, Tag } from "lucide-react";
import { Link } from "react-router";
import { type MarketplacePromotion } from "../model/promotion";
import { useTranslation } from "~/shared/lib/i18n";

const toneClasses: Record<MarketplacePromotion["tone"], { surface: string; halo: string; chip: string }> = {
  green: { surface: "from-[#194d37] to-[#2f7751]", halo: "bg-[#a6d9ae]/30", chip: "bg-[#dcefe0] text-[#245b3c]" },
  gold: { surface: "from-[#8e5709] to-[#c18517]", halo: "bg-[#ffe5a7]/35", chip: "bg-[#fff0c7] text-[#855206]" },
  violet: { surface: "from-[#4f3a79] to-[#765ba7]", halo: "bg-[#dfd4ff]/35", chip: "bg-[#eee9fa] text-[#584281]" },
  coral: { surface: "from-[#923d2d] to-[#c85d47]", halo: "bg-[#ffd0c3]/35", chip: "bg-[#fae5df] text-[#97402f]" },
};

export interface BannerStyles {
  containerStyle?: React.CSSProperties;
  containerClass: string;
  haloStyle?: React.CSSProperties;
  haloClass: string;
  chipStyle?: React.CSSProperties;
  chipClass: string;
}

export function parseHexColor(hex?: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function getBannerStyles(
  brandColorFallback?: string,
  toneName?: MarketplacePromotion["tone"]
): BannerStyles {
  const tone = toneClasses[toneName || "green"] || toneClasses.green;
  const rgb = parseHexColor(brandColorFallback);

  if (!rgb) {
    return {
      containerStyle: undefined,
      containerClass: tone.surface,
      haloStyle: undefined,
      haloClass: tone.halo,
      chipStyle: undefined,
      chipClass: tone.chip,
    };
  }

  const { r, g, b } = rgb;
  const darkR = Math.round(r * 0.55);
  const darkG = Math.round(g * 0.55);
  const darkB = Math.round(b * 0.55);
  const lightR = Math.min(255, Math.round(r * 1.25 + 20));
  const lightG = Math.min(255, Math.round(g * 1.25 + 20));
  const lightB = Math.min(255, Math.round(b * 1.25 + 20));

  return {
    containerStyle: {
      backgroundImage: `linear-gradient(135deg, rgb(${darkR}, ${darkG}, ${darkB}) 0%, rgb(${r}, ${g}, ${b}) 55%, rgb(${lightR}, ${lightG}, ${lightB}) 100%)`,
    },
    containerClass: "",
    haloStyle: {
      backgroundColor: `rgba(${lightR}, ${lightG}, ${lightB}, 0.35)`,
    },
    haloClass: "",
    chipStyle: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      color: "#ffffff",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      borderColor: "rgba(255, 255, 255, 0.25)",
    },
    chipClass: "border",
  };
}

function formatEndDate(date?: string | null, locale: string = "en") {
  if (!date) return "";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(parsed);
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
  const { t, language } = useTranslation();
  const dateLocale = language === "ru" ? "ru-RU" : language === "hy" ? "hy-AM" : "en-US";
  const bannerStyles = getBannerStyles(promotion?.brandColorFallback, promotion?.tone);
  const formattedEndDate = formatEndDate(promotion?.endDate, dateLocale);

  const promotionTypeLabel =
    promotion.type === "BuyXGetY"
      ? t("promotions.buyXGetY")
      : promotion.type === "FixedPrice"
        ? t("promotions.fixedPrice")
        : t("promotions.percentageDiscount");

  return (
    <div
      style={!promotion.visualUrl ? bannerStyles.containerStyle : undefined}
      className={`group relative min-h-56 overflow-hidden rounded-[1.5rem] bg-gradient-to-br p-5 text-white shadow-[0_12px_30px_rgba(15,23,42,0.10)] ${
        interactive ? "transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_38px_rgba(15,23,42,0.16)]" : ""
      } ${bannerStyles.containerClass}`}
    >
      {promotion.visualUrl ? (
        <>
          <img
            src={promotion.visualUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${interactive ? "transition duration-500 group-hover:scale-105" : ""}`}
          />
          <span className="absolute inset-0 bg-gradient-to-br from-slate-950/75 via-slate-950/35 to-slate-950/55" aria-hidden="true" />
        </>
      ) : null}
      <span
        style={!promotion.visualUrl ? bannerStyles.haloStyle : undefined}
        className={`absolute -right-12 -top-14 h-44 w-44 rounded-full blur-2xl ${bannerStyles.haloClass}`}
        aria-hidden="true"
      />
      <span className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full border-[18px] border-white/10" aria-hidden="true" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="max-w-[70%] text-xs font-bold uppercase tracking-[0.15em] text-white/70">{promotion.supplierName}</span>
          <ArrowUpRight
            className={`h-5 w-5 shrink-0 text-white/80 ${interactive ? "transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" : ""}`}
            aria-hidden="true"
          />
        </div>
        <div className="mt-auto pt-8">
          <span
            style={!promotion.visualUrl ? bannerStyles.chipStyle : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${bannerStyles.chipClass}`}
          >
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            {promotionTypeLabel}
          </span>
          <h2 className="mt-3 text-xl font-bold leading-tight tracking-[-0.04em]">{promotion.title}</h2>
          <p className="mt-2 text-2xl font-extrabold leading-none tracking-[-0.055em]">{promotion.benefitLabel}</p>
          {formattedEndDate ? (
            <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/75">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t("promotions.endsDate", { date: formattedEndDate })}
              {promotion.type === "BuyXGetY" ? (
                <>
                  <span aria-hidden="true">·</span>
                  <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("promotions.giftIncluded")}
                </>
              ) : null}
            </p>
          ) : promotion.type === "BuyXGetY" ? (
            <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/75">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              {t("promotions.giftIncluded")}
            </p>
          ) : null}
        </div>
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
