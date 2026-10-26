import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Input from "~/shared/ui/form/input";
import Button from "~/shared/ui/button";
import { useNavigate } from "react-router";
import {
  dashboardPathFor,
  getLoggedInUser,
  resetDatabase,
  signInWithSeedUser,
} from "~/shared/lib/indexed-db";
import { useToast } from "~/shared/ui/toast";
import { LanguageSwitcher, ThemeToggle } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!identifier || !password) {
      setError(t("common.required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await signInWithSeedUser(identifier, password);

      if (!user) {
        setError(t("auth.checkCredentials"));
        return;
      }

      navigate(dashboardPathFor(user.role));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("auth.checkCredentials");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetData() {
    setError(null);
    setIsResettingData(true);

    try {
      await resetDatabase();
      showToast({
        title: t("auth.dataResetSuccessTitle"),
        description: t("auth.dataResetSuccessDesc"),
        variant: "success",
      });
    } catch {
      showToast({
        title: t("auth.dataResetFailedTitle"),
        description: t("auth.dataResetFailedDesc"),
        variant: "error",
      });
    } finally {
      setIsResettingData(false);
    }
  }

  return (
    <main
      data-account-type="horeca"
      className="flex min-h-screen items-center justify-center bg-[#f3f6f4] px-4 py-10 text-slate-950"
    >
      <div className="relative mx-auto w-full max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t("common.backToHome")}</span>
          </a>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="w-full rounded-4xl border border-slate-200/80 bg-white p-8 shadow-2xl shadow-slate-900/10 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            {t("auth.loginEyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {t("auth.loginTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t("auth.loginSubtitle")}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <Input
              id="identifier"
              name="identifier"
              type="text"
              label={t("auth.emailOrUsername")}
              labelClassName="text-slate-700"
              placeholder={t("auth.emailOrUsernamePlaceholder")}
            />

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                label={t("auth.password")}
                labelClassName="text-slate-700"
                placeholder={t("auth.passwordPlaceholder")}
                containerClassName="relative"
              />
            </div>

            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">{t("auth.signInFailed")}</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="mt-2">
              {isSubmitting ? t("auth.loggingIn") : t("auth.logInButton")}
            </Button>

            <div className="mt-3 text-center">
              <a className="text-sm text-primary hover:underline" href="#">
                {t("auth.forgotPassword")}
              </a>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-5 text-center">
            <p className="text-xs text-slate-500">
              {t("auth.needFreshStart")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={isResettingData}
              disabled={isSubmitting}
              onClick={() => {
                void handleResetData();
              }}
              className="mt-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              {t("auth.resetData")}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            {t("auth.newToSynko")}{" "}
            <a
              className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
              href="/register"
            >
              {t("auth.createAccount")}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
