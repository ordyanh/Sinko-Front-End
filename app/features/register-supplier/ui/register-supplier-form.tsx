import { useEffect, useState } from "react";
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
import { registerSupplier } from "~/shared/api/auth";
import { ApiError } from "~/shared/api/http";
import { useFetcher } from "react-router";

type CategoriesLoaderResponse =
  | { ok: true; categories: Array<{ id: number; name: string }> }
  | { ok: false; error: string };

export default function RegisterSupplierForm() {
  const categoriesFetcher = useFetcher<CategoriesLoaderResponse>();
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ id: number; name: string }>
  >([]);

  const {
    register,
    control,
    handleSubmit,
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

  return (
    <main
      data-account-type="supplier"
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

        {registrationComplete ? (
          <RegistrationCompleteCard
            eyebrow="Request sent"
            title="Your request has been sent"
            description="We'll contact you soon after we review your supplier details."
            notice="Your request has been received. We'll get back to you shortly."
            registeredEmail={registeredEmail}
          />
        ) : (
          <div className="rounded-4xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-9">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                Supplier Registration
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Register your supply business
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Send your supplier details and we&apos;ll review the request
                before reaching out.
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
                    label="Company Name"
                    placeholder="Supplier LLC"
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
                    label="Mobile Number"
                    placeholder="+374 10 654321"
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
                    placeholder="Yerevan, Armenia"
                    errorMessage={errors.address?.message}
                    {...register("address")}
                    aria-invalid={errors.address ? "true" : "false"}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    id="taxCode"
                    type="text"
                    label="Tax Code (HVHH)"
                    placeholder="87654321"
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
                    Product Categories
                  </label>
                  <Controller
                    control={control}
                    name="categoryIds"
                    render={({ field }) => (
                      <Select
                        id="categoryIds"
                        multiple
                        value={(field.value ?? []).map((item) => String(item))}
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
                    )}
                  />
                  <FieldError message={errors.categoryIds?.message} />
                  {categoriesError ? (
                    <p className="mt-2 text-sm text-red-700">
                      {categoriesError}
                    </p>
                  ) : isLoadingCategories ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Loading categories...
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Select one or more categories that match your business.
                    </p>
                  )}
                </div>

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
                Create supplier account
              </Button>
            </form>
          </div>
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
