import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  supplierRegistrationSchema,
  toSupplierRegisterRequest,
  type SupplierRegistrationValues,
} from "~/entities/supplier";
import Button from "~/shared/ui/button";
import { FieldError, Input, Select } from "~/shared/ui/form";
import RegistrationCompleteCard from "~/shared/ui/registration-complete-card";
import { LanguageSwitcher, ThemeToggle } from "~/shared/ui";
import { useTranslation } from "~/shared/lib/i18n";
import { registerSupplier, resendSupplierCode, verifySupplier } from "~/shared/api/auth";
import { ApiError } from "~/shared/api/http";
import { useFetcher, useNavigate } from "react-router";

type CategoriesLoaderResponse =
  | { ok: true; categories: Array<{ id: number; name: string }> }
  | { ok: false; error: string };

export default function RegisterSupplierForm() {
  const navigate = useNavigate();
  const categoriesFetcher = useFetcher<CategoriesLoaderResponse>();
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ id: number; name: string }>
  >([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SupplierRegistrationValues>({
    mode: "onBlur",
    shouldUnregister: true,
    resolver: zodResolver(supplierRegistrationSchema),
    defaultValues: {
      companyName: "",
      email: "",
      mobile: "",
      address: "",
      taxCode: "",
      password: "",
      confirmPassword: "",
      categoryIds: [],
    },
  });
  const isLoadingCategories = categoriesFetcher.state !== "idle";
  const watchedPassword = watch("password") ?? "";
  const hasMinLength = watchedPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(watchedPassword);
  const hasNumber = /\d/.test(watchedPassword);
  const passwordScore = [hasMinLength, hasUppercase, hasNumber, watchedPassword.length >= 12].filter(Boolean).length;

  useEffect(() => {
    if (categoriesFetcher.data || categoriesFetcher.state !== "idle") {
      return;
    }
    categoriesFetcher.load("/api/categories?langId=2");
  }, []);

  useEffect(() => {
    if (!categoriesFetcher.data) {
      return;
    }

    if (!categoriesFetcher.data.ok) {
      setCategoriesError(categoriesFetcher.data.error);
      setCategoryOptions([]);
      return;
    }

    setCategoriesError(null);
    setCategoryOptions(categoriesFetcher.data.categories);

    if (categoriesFetcher.data.categories.length === 0) {
      setCategoriesError(
        "No categories were returned by the Dictionary service.",
      );
    }
  }, [categoriesFetcher.data]);

  const handleRegister = async (values: SupplierRegistrationValues) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const requestPayload = toSupplierRegisterRequest(values);
      await registerSupplier(requestPayload);
      setRegisteredEmail(values.email.trim());
      setRegistrationComplete(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          "We could not complete supplier registration. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await verifySupplier({ email: registeredEmail, verificationCode });
      navigate("/login");
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : t("common.error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!registeredEmail) return;
    setSubmitError(null);
    setSuccessMessage(null);
    setIsResending(true);
    try {
      await resendSupplierCode({ email: registeredEmail });
      setSuccessMessage(t("settings.emailVerificationSent"));
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsResending(false);
    }
  };

  const { t } = useTranslation();

  return (
    <main
      data-account-type="supplier"
      className="min-h-screen bg-[#f4f7f5] px-4 py-10 text-slate-950 sm:px-6"
    >
      <div className="relative mx-auto w-full max-w-3xl">
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

        {registrationComplete ? (
          <RegistrationCompleteCard
            eyebrow={t("auth.verificationNoticeTitle")}
            title={t("auth.verificationNoticeTitle")}
            description={t("auth.verificationNoticeDesc")}
            registeredEmail={registeredEmail}
            verificationCode={verificationCode}
            onVerificationCodeChange={setVerificationCode}
            onConfirm={(event) => void handleConfirmOtp(event)}
            onResend={() => void handleResendOtp()}
            isSubmitting={isSubmitting}
            isResending={isResending}
            error={submitError}
            successMessage={successMessage}
          />
        ) : (
          <div className="rounded-4xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-9">
            {/* Account Type Selector for new users */}
            <div className="mb-8 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5">
              <a
                href="/register-horeca"
                className="flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              >
                {t("auth.horecaTitle")}
              </a>
              <span className="flex items-center justify-center rounded-xl bg-white py-2.5 text-sm font-bold text-sky-700 shadow-xs">
                {t("auth.supplierTitle")}
              </span>
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700">
                {t("auth.supplierRegistrationEyebrow")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {t("auth.supplierRegistrationTitle")}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t("auth.supplierRegistrationSubtitle")}
              </p>
            </div>

            {submitError ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {submitError}
              </div>
            ) : null}

            <form
              className="space-y-6"
              onSubmit={handleSubmit(handleRegister)}
              noValidate
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    id="companyName"
                    type="text"
                    label={t("auth.companyName")}
                    placeholder={t("auth.companyNamePlaceholder")}
                    errorMessage={errors.companyName?.message}
                    {...register("companyName")}
                    aria-invalid={errors.companyName ? "true" : "false"}
                  />
                </div>

                <div>
                  <Input
                    id="email"
                    type="email"
                    label={t("auth.email")}
                    placeholder="sales@supplier.am"
                    errorMessage={errors.email?.message}
                    {...register("email")}
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                </div>

                <div>
                  <Input
                    id="mobile"
                    type="tel"
                    label={t("auth.mobile")}
                    placeholder={t("auth.mobilePlaceholder")}
                    errorMessage={errors.mobile?.message}
                    {...register("mobile")}
                    aria-invalid={errors.mobile ? "true" : "false"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    id="address"
                    type="text"
                    label={t("auth.address")}
                    placeholder={t("auth.addressPlaceholder")}
                    errorMessage={errors.address?.message}
                    {...register("address")}
                    aria-invalid={errors.address ? "true" : "false"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    id="taxCode"
                    type="text"
                    label={t("auth.taxCode")}
                    placeholder={t("auth.taxCodePlaceholder")}
                    errorMessage={errors.taxCode?.message}
                    {...register("taxCode")}
                    aria-invalid={errors.taxCode ? "true" : "false"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    className="mb-2 block text-sm font-medium text-slate-900"
                    htmlFor="categoryIds"
                  >
                    {t("auth.categories")}
                  </label>
                  <Controller
                    control={control}
                    name="categoryIds"
                    render={({ field }) => {
                      const selectedIds = field.value ?? [];
                      const toggleCategory = (catId: number) => {
                        if (selectedIds.includes(catId)) {
                          field.onChange(selectedIds.filter((id) => id !== catId));
                        } else {
                          field.onChange([...selectedIds, catId]);
                        }
                      };

                      return (
                        <div className="space-y-3">
                          {categoryOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {categoryOptions.map((option) => {
                                const isSelected = selectedIds.includes(option.id);
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => toggleCategory(option.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                      isSelected
                                        ? "border border-sky-300 bg-sky-50 text-sky-700 shadow-2xs"
                                        : "border border-dashed border-slate-300 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
                                    }`}
                                  >
                                    <span>{isSelected ? "✓" : "+"}</span>
                                    <span>{option.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                          <Select
                            id="categoryIds"
                            multiple
                            value={selectedIds.map((item) => String(item))}
                            onValueChange={(nextValues) => {
                              const values = Array.isArray(nextValues)
                                ? nextValues
                                : [nextValues];
                              field.onChange(
                                values
                                  .map((value) => Number(value))
                                  .filter(
                                    (value) => Number.isInteger(value) && value > 0,
                                  ),
                              );
                            }}
                            error={Boolean(errors.categoryIds)}
                            disabled={
                              isLoadingCategories || categoryOptions.length === 0
                            }
                          >
                            {categoryOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                      );
                    }}
                  />
                  <FieldError message={errors.categoryIds?.message} />
                  {categoriesError ? (
                    <p className="mt-2 text-sm text-red-700">
                      {categoriesError}
                    </p>
                  ) : isLoadingCategories ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {t("common.loading")}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      {t("auth.categoriesSelectPlaceholder")}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    id="password"
                    type="password"
                    label={t("auth.password")}
                    placeholder={t("auth.passwordPlaceholder")}
                    errorMessage={errors.password?.message}
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                  {watchedPassword.length > 0 ? (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex gap-1.5" aria-hidden="true">
                        {[1, 2, 3, 4].map((bar) => (
                          <span
                            key={bar}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              bar <= passwordScore
                                ? passwordScore >= 3
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
                        <span className={hasMinLength ? "text-emerald-700" : "text-slate-400"}>
                          ✓ {t("settings.ruleLength")}
                        </span>
                        <span className={hasUppercase ? "text-emerald-700" : "text-slate-400"}>
                          ✓ {t("settings.ruleUpper")}
                        </span>
                        <span className={hasNumber ? "text-emerald-700" : "text-slate-400"}>
                          ✓ {t("settings.ruleNumber")}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    label={t("auth.confirmPassword")}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    errorMessage={errors.confirmPassword?.message}
                    {...register("confirmPassword")}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                  />
                </div>
              </div>

              <Button type="submit" loading={isSubmitting}>
                {t("auth.createSupplierAccount")}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-5 text-center text-sm text-slate-600">
          {t("auth.alreadyHaveAccount")}{" "}
          <a className="font-semibold text-primary underline underline-offset-4 hover:opacity-80" href="/login">
            {t("nav.logIn")}
          </a>
        </p>
      </div>
    </main>
  );
}
