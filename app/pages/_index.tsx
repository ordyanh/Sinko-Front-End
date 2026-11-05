import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, BadgeCheck, Clock3, Gift, Store, Truck } from "lucide-react";
import type { Route } from "./+types/_index";
import { dashboardPathFor, getLoggedInUser } from "~/shared/lib/indexed-db";
import { LanguageSwitcher, ThemeToggle } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Synko — Connect HoReCa with trusted suppliers" },
    {
      name: "description",
      content:
        "Synko is the procurement platform for restaurants, cafes, and hotels in Yerevan. Source fresh produce, beverages, packaging, and more from trusted suppliers.",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    let isActive = true;

    void getLoggedInUser().then((user) => {
      if (isActive && user) {
        navigate(dashboardPathFor(user.role), { replace: true });
      }
    });

    return () => {
      isActive = false;
    };
  }, [navigate]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 py-4 shadow-xs backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-extrabold text-white shadow-sm">
              S
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-600">
                Synko
              </p>
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("landing.badge")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <a
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50"
            >
              {t("nav.logIn")}
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {t("landing.badge")}
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.12]">
              {t("landing.heroTitle1")}{" "}
              <span className="text-[#ea580c]">{t("landing.heroTitleHighlight")}</span>{" "}
              <span className="text-sky-600">{t("landing.heroTitle2")}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {t("landing.heroDescription")}
            </p>

            {/* 2 Clear Role-Based Primary CTAs */}
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
              <a
                href="/register-horeca"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#ea580c] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-950/15 transition hover:-translate-y-0.5 hover:bg-[#c2410c]"
              >
                <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("landing.registerHorecaBtn")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
              <a
                href="/register-supplier"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-950/15 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("landing.registerSupplierBtn")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <p className="text-2xl font-extrabold text-slate-950 tabular-nums sm:text-3xl">80+</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {t("landing.verifiedSuppliers")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <p className="text-2xl font-extrabold text-slate-950 tabular-nums sm:text-3xl">350+</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {t("landing.horecaBusinesses")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <p className="text-2xl font-extrabold text-slate-950 tabular-nums sm:text-3xl">1,500+</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {t("landing.productsCount")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <p className="text-2xl font-extrabold text-emerald-600 tabular-nums sm:text-3xl">24/7</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {t("landing.support247")}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Live Product & Order Preview Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c]/10 text-xs font-extrabold text-[#ea580c]">
                  AS
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                    {t("landing.featuresTitle")}
                  </p>
                  <p className="text-sm font-bold text-slate-900">Ararat Seafood LLC</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t("suppliers.verified")}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {t("landing.categoriesTitle")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("landing.categoriesSubtitle")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-extrabold text-slate-950 shadow-2xs tabular-nums">
                    19,500 ֏
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    08:00–12:00
                  </span>
                  <span>·</span>
                  <span>#ORD-2026-084</span>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                    <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("promotions.buyXGetY")}
                  </span>
                  <span className="text-xs font-extrabold text-violet-700 tabular-nums">
                    0 ֏ ({t("common.free")})
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-700">
                  {t("landing.featuresSubtitle")}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">
                  {t("landing.ctaTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {t("landing.ctaSubtitle")}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <a
                href="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-700"
              >
                <span>{t("landing.ctaRegisterBtn")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
