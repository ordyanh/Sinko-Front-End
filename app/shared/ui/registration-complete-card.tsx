import { MailCheck, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import Button from "~/shared/ui/button";
import { useTranslation } from "~/shared/lib/i18n";

type RegistrationCompleteCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  notice?: string;
  registeredEmail?: string;
  verificationCode?: string;
  onVerificationCodeChange?: (code: string) => void;
  onConfirm?: (event: FormEvent<HTMLFormElement>) => void;
  onResend?: () => void;
  isSubmitting?: boolean;
  isResending?: boolean;
  error?: string | null;
  successMessage?: string | null;
};

export default function RegistrationCompleteCard({
  eyebrow,
  title,
  description,
  notice,
  registeredEmail,
  verificationCode: controlledCode,
  onVerificationCodeChange,
  onConfirm,
  onResend,
  isSubmitting = false,
  isResending = false,
  error,
  successMessage,
}: RegistrationCompleteCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [localCode, setLocalCode] = useState("");
  const [cooldown, setCooldown] = useState(45);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = controlledCode ?? localCode;
  const setCode = (next: string) => {
    const cleaned = next.replace(/\D/g, "").slice(0, 6);
    setLocalCode(cleaned);
    onVerificationCodeChange?.(cleaned);
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const digits = Array.from({ length: 6 }, (_, index) => code[index] ?? "");

  function handleDigitChange(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setCode(nextDigits.join(""));

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    setCode(pasted);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (onConfirm) {
      onConfirm(event);
      return;
    }
    event.preventDefault();
    navigate("/login");
  }

  function handleResendClick() {
    setCooldown(45);
    onResend?.();
  }

  return (
    <div className="rounded-3xl border-2 border-primary/30 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-9">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
            {registeredEmail ? (
              <p className="mt-1.5 text-sm font-bold text-slate-900">
                {registeredEmail}
              </p>
            ) : null}
          </div>

          {notice ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleFormSubmit} className="space-y-5 pt-2">
            <div>
              <label
                htmlFor="otp-digit-0"
                className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                {t("auth.verificationCode")}
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-digit-${index}`}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    aria-label={`${t("auth.verificationCode")} ${index + 1}`}
                    placeholder="•"
                    className="h-13 w-11 rounded-xl border-2 border-slate-200 bg-white text-center text-lg font-extrabold text-slate-950 shadow-2xs transition focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 sm:h-14 sm:w-13"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={code.length < 4 && Boolean(onConfirm)}
                className="sm:flex-1"
              >
                {t("auth.verifyButton")}
              </Button>

              <button
                type="button"
                disabled={cooldown > 0 || isResending}
                onClick={handleResendClick}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t("auth.resendCode")}
                  {cooldown > 0 ? ` (00:${String(cooldown).padStart(2, "0")})` : ""}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
