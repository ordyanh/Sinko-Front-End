import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { Check, Globe, KeyRound, LogOut, X } from "lucide-react";
import Input from "~/shared/ui/form/input";
import Select from "~/shared/ui/form/select";
import Button from "~/shared/ui/button";
import { useToast } from "~/shared/ui/toast";
import { DashboardPageContent } from "~/shared/ui";
import { signOut } from "~/shared/lib/indexed-db";
import { changePassword, logoutUser, getCompanyInfo, updateCompanyLanguage } from "~/shared/api";
import { useTranslation, type Language } from "~/shared/lib/i18n";

const languageOptions = [
  { value: "ru", label: "Русский (Russian)" },
  { value: "hy", label: "Հայերեն (Armenian)" },
  { value: "en", label: "English (English)" },
];

// Mock data standing in for the supplier account settings until the API is wired up.
const initialPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const strengthColor = [
  "bg-red-400",
  "bg-red-400",
  "bg-amber-400",
  "bg-emerald-500",
];

export default function SupplierAccountPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useTranslation();

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordRules = useMemo(
    () => [
      { key: "length", label: t("settings.ruleLength"), test: (v: string) => v.length >= 8 },
      {
        key: "upper",
        label: t("settings.ruleUpper"),
        test: (v: string) => /[A-Z]/.test(v),
      },
      { key: "number", label: t("settings.ruleNumber"), test: (v: string) => /\d/.test(v) },
    ],
    [t],
  );

  const strengthCopy = useMemo(
    () => [
      t("settings.strengthTooWeak"),
      t("settings.strengthWeak"),
      t("settings.strengthFair"),
      t("settings.strengthStrong"),
    ],
    [t],
  );

  // We do not overwrite user's frontend language on mount since backend defaults to "en"
  // Language is changed explicitly via handleLanguageChange

  const passedRules = useMemo(
    () => passwordRules.filter((rule) => rule.test(passwordForm.newPassword)),
    [passwordForm.newPassword, passwordRules],
  );
  const strengthScore = passwordForm.newPassword ? passedRules.length : -1;

  function handlePasswordFieldChange(field: keyof typeof passwordForm) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  async function handleSavePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast({
        title: t("common.required"),
        description: t("common.required"),
        variant: "error",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({
        title: t("settings.passwordsDoNotMatch"),
        description: t("settings.passwordsDoNotMatch"),
        variant: "error",
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      await changePassword({
        oldPassword: passwordForm.currentPassword,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordForm);
      showToast({
        title: t("settings.changePassword"),
        description: t("settings.passwordUpdatedSuccess"),
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: t("settings.changePassword"),
        description: error instanceof Error ? error.message : t("settings.passwordUpdatedFailed"),
        variant: "error",
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleLanguageChange(nextValue: string | string[]) {
    const value = (Array.isArray(nextValue) ? (nextValue[0] ?? "hy") : nextValue) as Language;
    setLanguage(value);
    try {
      await updateCompanyLanguage({ language: value });
    } catch {
      // Backend fallback
    }
    showToast({
      title: t("settings.languageUpdatedTitle"),
      description: t("settings.languageUpdatedDesc"),
      variant: "success",
    });
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // Backend offline fallback
    }
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {t("settings.account")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t("settings.title")}
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {t("settings.subtitle")}
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {t("settings.changePassword")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("settings.changePasswordSubtitle")}
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-md space-y-4">
            <Input
              id="currentPassword"
              type="password"
              label={t("settings.currentPassword")}
              placeholder="••••••••"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange("currentPassword")}
              disabled={isSavingPassword}
            />
            <div>
              <Input
                id="newPassword"
                type="password"
                label={t("settings.newPassword")}
                placeholder="••••••••"
                value={passwordForm.newPassword}
                onChange={handlePasswordFieldChange("newPassword")}
                disabled={isSavingPassword}
              />

              <div className="mt-3 space-y-2.5">
                <div className="flex h-1.5 gap-1.5 overflow-hidden rounded-full bg-slate-100">
                  {passwordRules.map((rule, index) => (
                    <span
                      key={rule.key}
                      className={`flex-1 rounded-full transition-colors duration-300 ${
                        index <= strengthScore
                          ? strengthColor[strengthScore]
                          : "bg-slate-100"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <p
                    className={`text-xs font-semibold ${
                      strengthScore < 0
                        ? "text-slate-400"
                        : strengthScore === passwordRules.length
                          ? "text-emerald-600"
                          : "text-slate-500"
                    }`}
                  >
                    {strengthScore < 0
                      ? t("settings.passwordStrength")
                      : strengthCopy[strengthScore]}
                  </p>
                  {passwordRules.map((rule) => {
                    const isMet = passedRules.some((r) => r.key === rule.key);
                    return (
                      <span
                        key={rule.key}
                        className={`inline-flex items-center gap-1 text-xs ${
                          isMet ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {isMet ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {rule.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <Input
              id="confirmPassword"
              type="password"
              label={t("settings.confirmPassword")}
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange("confirmPassword")}
              disabled={isSavingPassword}
            />

            <Button
              type="button"
              className="w-auto!"
              onClick={handleSavePassword}
              loading={isSavingPassword}
            >
              {t("settings.savePassword")}
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {t("settings.language")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("settings.languageSubtitle")}
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-xs">
            <Select value={language} onValueChange={handleLanguageChange}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="rounded-3xl border border-red-100 bg-red-50/40 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {t("settings.logoutSection")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("settings.logoutSubtitle")}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-auto! border-red-200 bg-red-600 text-white hover:bg-red-700"
            onClick={() => void handleLogout()}
          >
            {t("settings.logoutButton")}
          </Button>
        </section>
      </div>
    </DashboardPageContent>
  );
}
