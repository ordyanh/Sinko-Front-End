import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { Check, Globe, KeyRound, LogOut, X } from "lucide-react";
import Input from "~/shared/ui/form/input";
import Select from "~/shared/ui/form/select";
import Button from "~/shared/ui/button";
import { useToast } from "~/shared/ui/toast";
import { DashboardPageContent } from "~/shared/ui";
import { signOut } from "~/shared/lib/indexed-db";

const MOCK_SAVE_DELAY_MS = 600;

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hy", label: "Armenian" },
  { value: "ru", label: "Russian" },
];

// Mock data standing in for the supplier account settings until the API is wired up.
const initialPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const passwordRules = [
  { key: "length", label: "8+ characters", test: (v: string) => v.length >= 8 },
  {
    key: "upper",
    label: "One uppercase letter",
    test: (v: string) => /[A-Z]/.test(v),
  },
  { key: "number", label: "One number", test: (v: string) => /\d/.test(v) },
] as const;

const strengthCopy = ["Too weak", "Weak", "Fair", "Strong"];
const strengthColor = [
  "bg-red-400",
  "bg-red-400",
  "bg-amber-400",
  "bg-emerald-500",
];

export default function SupplierAccountPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [language, setLanguage] = useState("en");

  const passedRules = useMemo(
    () => passwordRules.filter((rule) => rule.test(passwordForm.newPassword)),
    [passwordForm.newPassword],
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

  function handleSavePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast({
        title: "Missing information",
        description: "Please fill in all password fields.",
        variant: "error",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({
        title: "Passwords don't match",
        description: "New password and confirmation must be the same.",
        variant: "error",
      });
      return;
    }

    setIsSavingPassword(true);

    window.setTimeout(() => {
      setIsSavingPassword(false);
      setPasswordForm(initialPasswordForm);
      showToast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
        variant: "success",
      });
    }, MOCK_SAVE_DELAY_MS);
  }

  function handleLanguageChange(nextValue: string | string[]) {
    const value = Array.isArray(nextValue) ? (nextValue[0] ?? "en") : nextValue;
    setLanguage(value);
    showToast({
      title: "Language updated",
      description: "Your language preference has been saved.",
      variant: "success",
    });
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Account
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Account settings
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Manage your password, language and how you sign out of Synko.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Change Password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a strong password you don't use anywhere else.
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-md space-y-4">
            <Input
              id="currentPassword"
              type="password"
              label="Current Password"
              placeholder="••••••••"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange("currentPassword")}
              disabled={isSavingPassword}
            />
            <div>
              <Input
                id="newPassword"
                type="password"
                label="New Password"
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
                      ? "Password strength"
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
              label="Confirm New Password"
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
              Save Password
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
                Language
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the language used across your dashboard.
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
                Log out of Synko
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                You'll be redirected to the login page. Save any unsaved changes
                first.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-auto! border-red-200 bg-red-600 text-white hover:bg-red-700"
            onClick={() => void handleLogout()}
          >
            Logout
          </Button>
        </section>
      </div>
    </DashboardPageContent>
  );
}
