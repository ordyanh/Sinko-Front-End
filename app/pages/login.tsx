import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, RotateCcw, TriangleAlert } from "lucide-react";
import Input from "~/shared/ui/form/input";
import Button from "~/shared/ui/button";
import Modal from "~/shared/ui/modal";
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
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

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
      setIsConfirmingReset(false);
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

  function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recoveryEmail.trim()) return;
    setIsForgotModalOpen(false);
    setRecoveryEmail("");
    showToast({
      title: t("auth.verificationNoticeTitle"),
      description: t("settings.emailVerificationSent"),
      variant: "success",
    });
  }

  return (
    <main
      data-account-type="horeca"
      className="flex min-h-screen items-center justify-center bg-[#f3f6f4] px-4 py-10 text-slate-950"
    >
      <div className="relative mx-auto w-full max-w-[460px]">
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

        <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-2xl shadow-slate-900/10 sm:p-9">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              {t("auth.loginEyebrow")}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              Synko ID
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
            {t("auth.loginTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
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
              autoComplete="username"
              label={t("auth.emailOrUsername")}
              labelClassName="text-slate-700"
              placeholder={t("auth.emailOrUsernamePlaceholder")}
            />

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  {t("auth.password")}
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-semibold text-primary transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
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
          </form>

          {/* Protected Demo / Local DB Reset Block */}
          <div className="mt-7 border-t border-slate-200 pt-4">
            {!isConfirmingReset ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">{t("auth.needFreshStart")}</span>
                <button
                  type="button"
                  disabled={isSubmitting || isResettingData}
                  onClick={() => setIsConfirmingReset(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("auth.resetData")}</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <p className="text-xs font-semibold text-rose-900">
                  {t("auth.resetData")}?
                </p>
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingReset(false)}
                    disabled={isResettingData}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={isResettingData}
                    onClick={() => void handleResetData()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("common.confirm")}</span>
                  </button>
                </div>
              </div>
            )}
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

      {/* Password Recovery Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title={t("auth.forgotPassword")}
        description={t("auth.verificationNoticeDesc")}
        size="sm"
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <Input
            id="recovery-email"
            type="email"
            autoComplete="email"
            required
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            label={t("auth.email")}
            placeholder="chef@restaurant.am"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-auto"
              onClick={() => setIsForgotModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" className="w-auto">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>{t("auth.resendCode")}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
