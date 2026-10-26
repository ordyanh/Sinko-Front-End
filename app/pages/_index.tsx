import { useEffect } from "react";
import { useNavigate } from "react-router";
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
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-600 text-lg font-semibold text-white shadow-sm">
              S
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
                Synko
              </p>
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("landing.badge")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <a
              href="/login"
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              {t("nav.logIn")}
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">
              {t("landing.badge")}
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {t("landing.heroTitle1")}{" "}
              <span className="text-emerald-600">{t("landing.heroTitleHighlight")}</span>{" "}
              {t("landing.heroTitle2")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {t("landing.heroDescription")}
            </p>

            <div className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              >
                {t("landing.loginBtn")}
              </a>
              <a
                href="/register-horeca"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-700"
              >
                {t("landing.registerHorecaBtn")}
              </a>
              <a
                href="/register-supplier"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-900/10 transition hover:bg-sky-700"
              >
                {t("landing.registerSupplierBtn")}
              </a>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <p className="text-3xl font-semibold text-slate-950">80+</p>
                <p className="mt-2 text-sm text-slate-500">
                  {t("landing.verifiedSuppliers")}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <p className="text-3xl font-semibold text-slate-950">350+</p>
                <p className="mt-2 text-sm text-slate-500">
                  {t("landing.horecaBusinesses")}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <p className="text-3xl font-semibold text-slate-950">1,500+</p>
                <p className="mt-2 text-sm text-slate-500">
                  {t("landing.productsCount")}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <p className="text-3xl font-semibold text-slate-950">24/7</p>
                <p className="mt-2 text-sm text-slate-500">
                  {t("landing.support247")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/5">
            <div className="rounded-4xl bg-emerald-600/5 p-6 text-emerald-800">
              <p className="text-sm uppercase tracking-[0.24em] text-emerald-700 font-semibold">
                {t("landing.featuresTitle")}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                {t("landing.ctaTitle")}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {t("landing.featuresSubtitle")}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">
                  {t("landing.categoriesTitle")}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {t("landing.categoriesSubtitle")}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">
                  {t("landing.ctaSubtitle")}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {t("landing.heroDescription")}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-2">
              <a
                href="/register"
                className="flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-700"
              >
                {t("landing.ctaRegisterBtn")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
