import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  horecaActivityOptions,
  horecaRegistrationSchema,
  type HorecaRegistrationFormValues,
  type HorecaRegistrationValues,
} from "~/entities/horeca";
import Button from "~/shared/ui/button";
import { FieldError, Input, Select } from "~/shared/ui/form";
import RegistrationCompleteCard from "~/shared/ui/registration-complete-card";
import { useFetcher, useNavigate } from "react-router";

type FetcherIntent = "register" | "confirm" | "resend";

type RegisterHorecaActionResponse =
  | { ok: true; step: "verify" | "done"; message?: string }
  | { ok: false; error: string };

export default function RegisterHorecaForm() {
  const navigate = useNavigate();
  const fetcher = useFetcher<RegisterHorecaActionResponse>();
  const [verificationStep, setVerificationStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<FetcherIntent | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<
    HorecaRegistrationFormValues,
    undefined,
    HorecaRegistrationValues
  >({
    mode: "onBlur",
    shouldUnregister: true,
    resolver: zodResolver(horecaRegistrationSchema),
    defaultValues: {
      companyName: "",
      email: "",
      mobile: "",
      address: "",
      taxCode: "",
      password: "",
      confirmPassword: "",
      activityType: "Hotel",
      otherActivityType: "",
    },
  });

  const selectedActivityType = watch("activityType");
  const showOtherActivityInput = selectedActivityType === "Other";

  useEffect(() => {
    if (fetcher.state !== "idle") {
      return;
    }

    setActiveIntent(null);

    if (!fetcher.data) {
      return;
    }

    if (activeIntent === "confirm") {
      navigate("/login");
      return;
    }

    if (!fetcher.data.ok) {
      setSubmitError(fetcher.data.error);
      return;
    }

    if (fetcher.data.message) {
      setSuccessMessage(fetcher.data.message);
    }

    if (fetcher.data.step === "verify") {
      setVerificationStep(true);
      return;
    }

    navigate("/login");
  }, [activeIntent, fetcher.data, fetcher.state, navigate]);

  const handleRegister = (values: HorecaRegistrationValues) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setActiveIntent("register");
    setRegisteredEmail(values.email.trim());

    const payload = new FormData();
    payload.set("intent", "register");
    payload.set("companyName", values.companyName);
    payload.set("email", values.email);
    payload.set("mobile", values.mobile);
    payload.set("address", values.address);
    payload.set("taxCode", values.taxCode);
    payload.set("password", values.password);
    payload.set("confirmPassword", values.confirmPassword);
    payload.set("activityType", values.activityType);
    payload.set("otherActivityType", values.otherActivityType?.trim() ?? "");

    fetcher.submit(payload, { method: "post", action: "/register-horeca" });
  };

  const handleConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    setActiveIntent("confirm");

    const payload = new FormData();
    payload.set("intent", "confirm");
    payload.set("email", registeredEmail);
    payload.set("verificationCode", verificationCode);

    fetcher.submit(payload, { method: "post", action: "/register-horeca" });
  };

  const handleResend = () => {
    const email = registeredEmail.trim();

    if (!email) {
      setSubmitError("Enter an email address before requesting a new code.");
      return;
    }

    setSubmitError(null);
    setSuccessMessage(null);
    setActiveIntent("resend");

    const payload = new FormData();
    payload.set("intent", "resend");
    payload.set("email", email);

    fetcher.submit(payload, { method: "post", action: "/register-horeca" });
  };

  const isBusy = fetcher.state !== "idle";
  const isSubmitting = isBusy && activeIntent !== "resend";
  const isResending = isBusy && activeIntent === "resend";

  return (
    <main
      data-account-type="horeca"
      className="min-h-screen bg-[#f4f7f5] px-4 py-10 text-slate-950 sm:px-6"
    >
      <div className="relative mx-auto w-full max-w-3xl">
        <a
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </a>

        {!verificationStep ? (
          <div className="rounded-4xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-9">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                HoReCa Registration
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Register your hospitality business
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Create your account, then confirm the email code sent by the
                auth service.
              </p>
            </div>

            {submitError ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
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
                    label="Organization Name"
                    placeholder="Restaurant LLC"
                    errorMessage={errors.companyName?.message}
                    {...register("companyName")}
                    aria-invalid={errors.companyName ? "true" : "false"}
                  />
                </div>

                <div>
                  <Input
                    id="email"
                    type="email"
                    label="Business Email"
                    placeholder="owner@restaurant.am"
                    errorMessage={errors.email?.message}
                    {...register("email")}
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                </div>

                <div>
                  <Input
                    id="mobile"
                    type="tel"
                    label="Mobile Number"
                    placeholder="+374 10 123456"
                    errorMessage={errors.mobile?.message}
                    {...register("mobile")}
                    aria-invalid={errors.mobile ? "true" : "false"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    id="address"
                    type="text"
                    label="Registered Address"
                    placeholder="Mashtots Ave 45, Kentron, Yerevan"
                    errorMessage={errors.address?.message}
                    {...register("address")}
                    aria-invalid={errors.address ? "true" : "false"}
                  />
                </div>

                <div>
                  <Input
                    id="taxCode"
                    type="text"
                    label="Tax Code (HVHH)"
                    placeholder="12345678"
                    errorMessage={errors.taxCode?.message}
                    {...register("taxCode")}
                    aria-invalid={errors.taxCode ? "true" : "false"}
                  />
                </div>

                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-900"
                    htmlFor="activityType"
                  >
                    Type of Activity
                  </label>
                  <Controller
                    control={control}
                    name="activityType"
                    render={({ field }) => (
                      <Select
                        id="activityType"
                        value={field.value}
                        onValueChange={(value) => field.onChange(String(value))}
                        error={Boolean(errors.activityType)}
                      >
                        {horecaActivityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  <FieldError message={errors.activityType?.message} />
                </div>

                {showOtherActivityInput ? (
                  <div className="sm:col-span-2">
                    <Input
                      id="otherActivityType"
                      type="text"
                      label="Describe your activity type"
                      placeholder="Catering service, bakery chain, etc."
                      errorMessage={errors.otherActivityType?.message}
                      {...register("otherActivityType")}
                      aria-invalid={errors.otherActivityType ? "true" : "false"}
                    />
                  </div>
                ) : null}

                <div>
                  <Input
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="Minimum 8 characters"
                    errorMessage={errors.password?.message}
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                </div>

                <div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    placeholder="Repeat your password"
                    errorMessage={errors.confirmPassword?.message}
                    {...register("confirmPassword")}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                  />
                </div>
              </div>

              <Button type="submit" loading={isSubmitting}>
                Create HoReCa account
              </Button>
            </form>
          </div>
        ) : (
          <RegistrationCompleteCard
            eyebrow="Registration submitted"
            title="Your registration request is in progress"
            description="We've received your HoReCa registration details and will continue with email verification next."
            notice="Please check your inbox for the verification code and continue below."
            registeredEmail={registeredEmail}
          />
        )}

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <a className="font-semibold text-primary" href="/login">
            Login
          </a>
        </p>
      </div>
    </main>
  );
}
