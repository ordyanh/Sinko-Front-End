import { ArrowLeft, Building2, Store, CheckCircle2, ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

export default function RegisterChoicePage() {
  const { t } = useTranslation();

  return (
    <main
      data-account-type="horeca"
      className="flex min-h-screen items-center justify-center bg-[#f3f6f4] px-4 py-12 text-slate-950 sm:px-6"
    >
      <div className="relative mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t("common.backToHome")}</span>
          </a>

          <LanguageSwitcher />
        </div>

        <div className="text-center">
          <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
            {t("auth.registerTitle")}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {t("auth.chooseAccountType")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            {t("auth.chooseAccountTypeSubtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* HoReCa Card */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-emerald-200/80 bg-white p-7 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-900/10 sm:p-9">
            <div>
              <div className="flex items-center justify-between">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Store className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {t("auth.horecaBadge")}
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-950">
                {t("auth.horecaTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t("auth.horecaDesc")}
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{t("auth.horecaFeature1")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{t("auth.horecaFeature2")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{t("auth.horecaFeature3")}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <a
                href="/register-horeca"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-700"
              >
                <span>{t("auth.registerAsHorecaBtn")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>

          {/* Supplier Card */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-sky-200/80 bg-white p-7 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:border-sky-500 hover:shadow-2xl hover:shadow-sky-900/10 sm:p-9">
            <div>
              <div className="flex items-center justify-between">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Building2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {t("auth.supplierBadge")}
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-950">
                {t("auth.supplierTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t("auth.supplierDesc")}
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{t("auth.supplierFeature1")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{t("auth.supplierFeature2")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{t("auth.supplierFeature3")}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <a
                href="/register-supplier"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-900/10 transition hover:bg-sky-700"
              >
                <span>{t("auth.registerAsSupplierBtn")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          {t("auth.alreadyHaveAccount")}{" "}
          <a className="font-semibold text-primary underline underline-offset-4 hover:opacity-80" href="/login">
            {t("nav.logIn")}
          </a>
        </p>
      </div>
    </main>
  );
}
