import { useCallback, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, CheckCircle2, Lock, MapPin, PencilLine, Plus, RefreshCw } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import Button from "~/shared/ui/button";
import { FieldError, Input } from "~/shared/ui/form";
import Modal from "~/shared/ui/modal";
import { useToast } from "~/shared/ui/toast";
import { DashboardPageContent, ArmeniaMapPicker, AddressAutocomplete } from "~/shared/ui";
import { getCurrentUserEmployeeRole } from "~/shared/lib/auth-token";
import {
  getDeliveryAddressesForCurrentHoreca,
  saveDeliveryAddressForCurrentHoreca,
  syncDeliveryAddressesForCurrentHoreca,
  type StoredDeliveryAddress,
} from "~/shared/lib/indexed-db";
import {
  getCompanyInfo,
  updateCompany,
  requestEmailChange,
  requestHvhhChange,
  addDeliveryPoint,
  type CompanyInfoDto,
  type UpdateCompanyRequest,
} from "~/shared/api";
import { useTranslation } from "~/shared/lib/i18n";
import { armenianPhoneSchema } from "~/shared/lib/phone-validation";

const companyInfoSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  phoneNumber: armenianPhoneSchema,
  companyAddress: z.string().trim().min(1, "Company address is required."),
  productCategories: z.string().trim().min(1, "Product categories are required."),
  serviceAreas: z.string().trim().min(1, "Service areas are required."),
  taxId: z.string().trim().min(1, "HVHH is required."),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
});

type CompanyInfoState = z.infer<typeof companyInfoSchema>;

const initialCompanyInfo: CompanyInfoState = {
  companyName: "Cascade Bistro LLC",
  phoneNumber: "+374 10 432100",
  companyAddress: "Tumanyan St 18, Kentron, Yerevan",
  productCategories: "Armenian Cuisine, European Cuisine, Catering",
  serviceAreas: "Kentron, Arabkir, Ajapnyak",
  taxId: "00876543",
  email: "hello@cascadebistro.am",
};

const deliveryAddressFormSchema = z.object({
  label: z.string().trim().max(80, "Address name must be 80 characters or fewer.").optional(),
  fullAddress: z.string().trim().min(1, "Full address is required."),
  contactPerson: z.string().trim().min(1, "Contact person is required."),
  contactPhone: armenianPhoneSchema,
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
});

type DeliveryAddressFormValues = z.infer<typeof deliveryAddressFormSchema>;

function getDeliveryAddressFormDefaults(
  address?: StoredDeliveryAddress,
): DeliveryAddressFormValues {
  return {
    label: address?.label ?? "",
    fullAddress: address?.fullAddress ?? "",
    contactPerson: address?.contactPerson ?? "",
    contactPhone: address?.contactPhone ?? "",
    lat: address?.lat ?? null,
    lon: address?.lon ?? null,
  };
}

export default function HorecaCompanyInformationPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoState>(initialCompanyInfo);
  const [rawCompanyData, setRawCompanyData] = useState<CompanyInfoDto | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyLoadError, setCompanyLoadError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState<StoredDeliveryAddress[]>([]);
  const [isLoadingDeliveryAddresses, setIsLoadingDeliveryAddresses] = useState(true);
  const [deliveryAddressLoadError, setDeliveryAddressLoadError] = useState<string>();
  const [isDeliveryAddressModalOpen, setIsDeliveryAddressModalOpen] = useState(false);
  const [editingDeliveryAddress, setEditingDeliveryAddress] = useState<StoredDeliveryAddress>();
  const [changingAddressId, setChangingAddressId] = useState<string>();

  const employeeRole = getCurrentUserEmployeeRole();
  const isPurchasingEmployee = employeeRole === "PurchasingEmployee";

  const form = useForm<CompanyInfoState>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: initialCompanyInfo,
  });
  const {
    register,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const resetRef = useRef(reset);
  resetRef.current = reset;

  const deliveryAddressForm = useForm<DeliveryAddressFormValues>({
    resolver: zodResolver(deliveryAddressFormSchema),
    defaultValues: getDeliveryAddressFormDefaults(),
  });
  const {
    register: registerDeliveryAddress,
    reset: resetDeliveryAddress,
    setError: setDeliveryAddressError,
    formState: { errors: deliveryAddressErrors, isSubmitting: isSavingDeliveryAddress },
  } = deliveryAddressForm;

  const loadCompanyData = useCallback(async () => {
    setIsLoadingCompany(true);
    setCompanyLoadError(null);
    try {
      const info = await getCompanyInfo();
      if (info) {
        setRawCompanyData(info);

        const categoriesString =
          info.productCategories && info.productCategories.length > 0
            ? info.productCategories.map((c) => c.name).join(", ")
            : info.description || initialCompanyInfo.productCategories;

        const serviceAreasString =
          (info.customServiceAreas && info.customServiceAreas.length > 0
            ? info.customServiceAreas.join(", ")
            : info.serviceAreas?.map((s) => s.name).join(", ")) || initialCompanyInfo.serviceAreas;

        const merged: CompanyInfoState = {
          companyName: info.companyName || initialCompanyInfo.companyName,
          phoneNumber: info.phoneNumber || initialCompanyInfo.phoneNumber,
          companyAddress: info.address || initialCompanyInfo.companyAddress,
          productCategories: categoriesString,
          serviceAreas: serviceAreasString,
          taxId: info.taxCode || info.hvhh || initialCompanyInfo.taxId,
          email: info.email || initialCompanyInfo.email,
        };

        setCompanyInfo(merged);
        resetRef.current(merged);

        // If backend returned delivery addresses, seed them as the authoritative source
        if (info.deliveryAddresses && Array.isArray(info.deliveryAddresses)) {
          const mapped: StoredDeliveryAddress[] = info.deliveryAddresses.map((da) => ({
            id: da.id,
            label: da.label ?? "Delivery address",
            fullAddress: da.fullAddress,
            contactPerson: da.contactPerson ?? "",
            contactPhone: da.contactPhone ?? "",
            active: da.active,
            approved: da.approved,
            accountId: info.id ?? "current-company",
            lat: da.lat ?? null,
            lon: da.lon ?? null,
          }));
          setDeliveryAddresses(mapped);
          void syncDeliveryAddressesForCurrentHoreca(mapped);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load company profile from server.";
      setCompanyLoadError(msg);
    } finally {
      setIsLoadingCompany(false);
      setIsLoadingDeliveryAddresses(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void loadCompanyData();

    void getDeliveryAddressesForCurrentHoreca()
      .then((addresses) => {
        if (isCurrent && addresses.length > 0) {
          setDeliveryAddresses((prev) => (prev.length === 0 ? addresses : prev));
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setDeliveryAddressLoadError(
            error instanceof Error ? error.message : "We couldn't load delivery addresses.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingDeliveryAddresses(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [loadCompanyData]);

  function openEditModal() {
    if (isPurchasingEmployee) {
      showToast({
        title: t("settings.accessRestricted"),
        description: t("settings.purchasingCannotModify"),
        variant: "error",
      });
      return;
    }
    reset(companyInfo);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    if (!isSubmitting) {
      setIsEditModalOpen(false);
    }
  }

  const handleSave: SubmitHandler<CompanyInfoState> = async (values) => {
    if (isPurchasingEmployee) {
      showToast({
        title: t("settings.accessRestricted"),
        description: t("settings.purchasingCannotModify"),
        variant: "error",
      });
      return;
    }

    try {
      const customAreas = values.serviceAreas
        ? values.serviceAreas.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const updatePayload: UpdateCompanyRequest = {
        companyName: values.companyName,
        phoneNumber: values.phoneNumber,
        address: values.companyAddress,
        description: values.productCategories,
        customServiceAreas: customAreas,
      };

      const result = await updateCompany(updatePayload);

      // Handle HVHH change request if modified
      if (values.taxId && values.taxId !== companyInfo.taxId) {
        try {
          await requestHvhhChange({
            newHvhh: values.taxId,
            reason: "Updated via company information settings",
          });
          showToast({
            title: t("settings.taxIdRequested"),
            description: t("settings.taxIdRequestedDesc"),
            variant: "info",
          });
        } catch (hvhhErr) {
          showToast({
            title: "Tax ID request failed",
            description: hvhhErr instanceof Error ? hvhhErr.message : "Could not submit HVHH change request.",
            variant: "error",
          });
        }
      }

      // Handle Email change request if modified
      if (values.email && values.email.toLowerCase() !== companyInfo.email.toLowerCase()) {
        try {
          await requestEmailChange({
            newEmail: values.email,
          });
          showToast({
            title: t("settings.emailVerificationSent"),
            description: `A verification code was sent to ${values.email}. Please verify to confirm the change.`,
            variant: "info",
          });
        } catch (emailErr) {
          showToast({
            title: "Email change request failed",
            description: emailErr instanceof Error ? emailErr.message : "Could not send verification code.",
            variant: "error",
          });
        }
      }

      setCompanyInfo(values);
      reset(values);
      setIsEditModalOpen(false);

      if (result?.status === "pending_approval") {
        showToast({
          title: "Changes pending approval",
          description: result.message || "Your edit limit was reached. Changes were submitted for Synko Admin review.",
          variant: "info",
        });
      } else {
        showToast({
          title: t("settings.companyUpdated"),
          description: t("settings.companyUpdatedDesc"),
          variant: "success",
        });
      }

      // Refresh latest from server
      void loadCompanyData();
    } catch (error) {
      showToast({
        title: t("settings.couldNotUpdateCompany"),
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "error",
      });
    }
  };

  function openDeliveryAddressModal(address?: StoredDeliveryAddress) {
    setEditingDeliveryAddress(address);
    resetDeliveryAddress(getDeliveryAddressFormDefaults(address));
    setIsDeliveryAddressModalOpen(true);
  }

  function closeDeliveryAddressModal() {
    if (!isSavingDeliveryAddress) {
      setIsDeliveryAddressModalOpen(false);
      setEditingDeliveryAddress(undefined);
    }
  }

  const handleSaveDeliveryAddress: SubmitHandler<DeliveryAddressFormValues> = async (values) => {
    try {
      // Connect to backend CustomersController endpoint
      try {
        await addDeliveryPoint({
          deliveryAddress: values.fullAddress,
          phoneNumber: values.contactPhone,
          pointName: values.label || values.contactPerson,
          lat: values.lat,
          lon: values.lon,
        });
      } catch (backendErr) {
        console.warn("Backend addDeliveryPoint notice:", backendErr);
      }

      const savedAddress = await saveDeliveryAddressForCurrentHoreca({
        id: editingDeliveryAddress?.id,
        ...values,
        active: editingDeliveryAddress?.active,
      });

      setDeliveryAddresses((currentAddresses) =>
        [...currentAddresses.filter((address) => address.id !== savedAddress.id), savedAddress].sort(
          (first, second) => (first.label ?? first.fullAddress).localeCompare(second.label ?? second.fullAddress),
        ),
      );

      resetDeliveryAddress(getDeliveryAddressFormDefaults(savedAddress));
      setIsDeliveryAddressModalOpen(false);
      setEditingDeliveryAddress(undefined);

      // Re-fetch backend company data to get the backend-assigned IDs and synchronize
      void loadCompanyData();

      showToast({
        title: editingDeliveryAddress ? "Delivery address updated" : "Delivery address added",
        description: "Its approval and active status determine whether it is available at checkout.",
        variant: "success",
      });
    } catch (error) {
      setDeliveryAddressError("root.serverError", {
        type: "server",
        message: error instanceof Error ? error.message : "We couldn't save this delivery address.",
      });
    }
  };

  async function setDeliveryAddressActive(address: StoredDeliveryAddress, active: boolean) {
    setChangingAddressId(address.id);
    try {
      const savedAddress = await saveDeliveryAddressForCurrentHoreca({ ...address, active });
      setDeliveryAddresses((currentAddresses) =>
        currentAddresses.map((currentAddress) =>
          currentAddress.id === savedAddress.id ? savedAddress : currentAddress,
        ),
      );
      showToast({
        title: active ? "Delivery address activated" : "Delivery address deactivated",
        description: active
          ? "It can now be selected during checkout."
          : "It will be hidden from checkout until reactivated.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Couldn't update status",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "error",
      });
    } finally {
      setChangingAddressId(undefined);
    }
  }

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {t("settings.account")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {t("settings.companyInfoTitle")}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              {t("settings.companyInfoSubtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadCompanyData()}
              disabled={isLoadingCompany}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingCompany ? "animate-spin" : ""}`} />
              {t("settings.refresh")}
            </Button>
            <Button
              type="button"
              className="gap-2 sm:w-auto"
              onClick={openEditModal}
              disabled={isPurchasingEmployee || isLoadingCompany}
              title={isPurchasingEmployee ? t("settings.editRestricted") : undefined}
            >
              {isPurchasingEmployee ? (
                <>
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {t("settings.editRestricted")}
                </>
              ) : (
                <>
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  {t("settings.editDetails")}
                </>
              )}
            </Button>
          </div>
        </header>

        {companyLoadError && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{companyLoadError}</span>
            </div>
            <Button type="button" size="sm" variant="secondary" className="border-rose-300 text-rose-800 hover:bg-rose-100" onClick={() => void loadCompanyData()}>
              {t("common.reset")}
            </Button>
          </div>
        )}

        {rawCompanyData && rawCompanyData.updateCount24h !== undefined && rawCompanyData.updateCount24h >= 2 && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>{t("settings.editLimitReached")}:</strong> {t("settings.editLimitReachedDesc", undefined, { count: rawCompanyData.updateCount24h })}
            </span>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {t("settings.companyDetails")}
                </h2>
                <p className="text-xs text-slate-500">{t("settings.officialProfileVerified")}</p>
              </div>
            </div>

            {rawCompanyData?.subscriptionPlan && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Plan: {rawCompanyData.subscriptionPlan}
              </span>
            )}
          </div>

          {isLoadingCompany ? (
            <div className="mt-8 flex items-center justify-center py-12 text-slate-400">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              <span>{t("settings.loadingCompanyProfile")}</span>
            </div>
          ) : (
            <dl className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <CompanyInfoDetail label={t("auth.companyName")} value={companyInfo.companyName} />
              <CompanyInfoDetail label={t("auth.mobile")} value={companyInfo.phoneNumber} />
              <CompanyInfoDetail label={t("auth.address")} value={companyInfo.companyAddress} />
              <CompanyInfoDetail label={t("auth.taxCode")} value={companyInfo.taxId} />
              <CompanyInfoDetail label={t("auth.email")} value={companyInfo.email} />
              <CompanyInfoDetail label={t("auth.categories")} value={companyInfo.productCategories} />
              <CompanyInfoDetail label={t("auth.activityType")} value={companyInfo.serviceAreas} />
            </dl>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {t("settings.deliveryAddresses")}
                </h2>
                <p className="text-xs text-slate-500">{t("settings.deliveryAddressesDesc")}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 sm:w-auto"
              onClick={() => openDeliveryAddressModal()}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("settings.addDeliveryAddress")}
            </Button>
          </div>

          {isLoadingDeliveryAddresses ? (
            <p className="mt-7 text-sm text-slate-500">{t("settings.loadingDeliveryAddresses")}</p>
          ) : deliveryAddressLoadError ? (
            <p className="mt-7 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{deliveryAddressLoadError}</p>
          ) : deliveryAddresses.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <p className="font-semibold text-slate-900">{t("settings.noDeliveryAddresses")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("settings.addReceivingLocationPrompt")}</p>
            </div>
          ) : (
            <ul className="mt-7 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {deliveryAddresses.map((address) => (
                <li key={address.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{address.label ?? t("settings.deliveryAddresses")}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${address.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {address.approved ? t("settings.approved") : t("settings.awaitingApproval")}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${address.active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}`}>
                        {address.active ? t("common.active") : t("common.inactive")}
                      </span>
                      {address.lat && address.lon ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          {address.lat.toFixed(4)}, {address.lon.toFixed(4)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{address.fullAddress}</p>
                    <p className="mt-1 text-xs text-slate-500">{address.contactPerson} · {address.contactPhone}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" className="sm:w-auto" onClick={() => openDeliveryAddressModal(address)}>
                      <PencilLine className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{t("common.edit")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="border border-slate-200 sm:w-auto" disabled={changingAddressId === address.id} onClick={() => void setDeliveryAddressActive(address, !address.active)}>
                      {changingAddressId === address.id ? t("common.saving") : address.active ? t("settings.inactive") : t("settings.active")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        title={t("settings.editCompanyInfo")}
        description={t("settings.companyInfoSubtitle")}
        onClose={closeEditModal}
      >
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={form.handleSubmit(handleSave)}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="companyName"
              label={t("auth.companyName")}
              autoComplete="organization"
              errorMessage={errors.companyName?.message}
              {...register("companyName")}
            />
            <Input
              id="phoneNumber"
              type="tel"
              label={t("auth.mobile")}
              placeholder={t("auth.mobilePlaceholder")}
              autoComplete="tel"
              errorMessage={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />
            <Input
              id="companyAddress"
              label={t("auth.address")}
              autoComplete="street-address"
              className="sm:col-span-2"
              errorMessage={errors.companyAddress?.message}
              {...register("companyAddress")}
            />
            <Input
              id="taxId"
              label={t("auth.taxCode")}
              errorMessage={errors.taxId?.message}
              {...register("taxId")}
            />
            <Input
              id="email"
              type="email"
              label={t("auth.email")}
              autoComplete="email"
              errorMessage={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="productCategories"
              label={t("auth.categories")}
              className="sm:col-span-2"
              placeholder={t("settings.categoriesPlaceholder")}
              errorMessage={errors.productCategories?.message}
              {...register("productCategories")}
            />
            <Input
              id="serviceAreas"
              label={t("auth.activityType")}
              className="sm:col-span-2"
              placeholder={t("settings.serviceAreasPlaceholder")}
              errorMessage={errors.serviceAreas?.message}
              {...register("serviceAreas")}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-32"
              onClick={closeEditModal}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="w-full sm:w-40" loading={isSubmitting}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeliveryAddressModalOpen}
        size="xl"
        title={editingDeliveryAddress ? t("settings.editDeliveryAddress") : t("settings.addDeliveryAddress")}
        description={t("settings.deliveryAddressModalDesc")}
        onClose={closeDeliveryAddressModal}
      >
        <form className="flex flex-col gap-5" noValidate onSubmit={deliveryAddressForm.handleSubmit(handleSaveDeliveryAddress)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Form Fields: 5 columns on desktop */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <Input
                id="deliveryAddressLabel"
                label={t("settings.addressNameOptional")}
                placeholder={t("settings.addressNamePlaceholder")}
                errorMessage={deliveryAddressErrors.label?.message}
                {...registerDeliveryAddress("label")}
              />
              <AddressAutocomplete
                id="deliveryAddressFullAddress"
                label={t("settings.fullAddress")}
                placeholder={t("settings.fullAddressPlaceholder")}
                value={deliveryAddressForm.watch("fullAddress") || ""}
                onChange={(val) => {
                  deliveryAddressForm.setValue("fullAddress", val, { shouldValidate: true });
                }}
                onSelectAddress={(selectedAddr, coords) => {
                  deliveryAddressForm.setValue("fullAddress", selectedAddr, { shouldValidate: true });
                  deliveryAddressForm.setValue("lat", coords.lat, { shouldValidate: true });
                  deliveryAddressForm.setValue("lon", coords.lon, { shouldValidate: true });
                }}
                hint={t("settings.addressInputHint")}
                errorMessage={deliveryAddressErrors.fullAddress?.message}
              />
              <Input
                id="deliveryAddressContactPerson"
                label={t("settings.contactPerson")}
                autoComplete="name"
                errorMessage={deliveryAddressErrors.contactPerson?.message}
                {...registerDeliveryAddress("contactPerson")}
              />
              <Input
                id="deliveryAddressContactPhone"
                type="tel"
                label={t("settings.contactPhone")}
                placeholder={t("auth.mobilePlaceholder")}
                autoComplete="tel"
                errorMessage={deliveryAddressErrors.contactPhone?.message}
                {...registerDeliveryAddress("contactPhone")}
              />
              <FieldError message={deliveryAddressErrors.root?.serverError?.message} />
            </div>

            {/* Map Picker: 7 columns on desktop */}
            <div className="lg:col-span-7 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  {t("settings.armeniaMapTitle")}
                </label>
                {deliveryAddressForm.watch("lat") && deliveryAddressForm.watch("lon") ? (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {t("settings.pointSelected")}: {deliveryAddressForm.watch("lat")?.toFixed(4)}, {deliveryAddressForm.watch("lon")?.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    {t("settings.pointNotSelected")}
                  </span>
                )}
              </div>
              <ArmeniaMapPicker
                value={{
                  lat: deliveryAddressForm.watch("lat") ?? null,
                  lon: deliveryAddressForm.watch("lon") ?? null,
                }}
                onChange={(coords) => {
                  deliveryAddressForm.setValue("lat", coords.lat, { shouldValidate: true });
                  deliveryAddressForm.setValue("lon", coords.lon, { shouldValidate: true });
                }}
                onAddressResolved={(resolvedAddr) => {
                  if (resolvedAddr) {
                    deliveryAddressForm.setValue("fullAddress", resolvedAddr, { shouldValidate: true });
                  }
                }}
                initialAddressQuery={deliveryAddressForm.getValues("fullAddress")}
                height="420px"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            <Button type="button" variant="ghost" className="w-full sm:w-32" onClick={closeDeliveryAddressModal} disabled={isSavingDeliveryAddress}>{t("common.cancel")}</Button>
            <Button type="submit" className="w-full sm:w-40" loading={isSavingDeliveryAddress}>{editingDeliveryAddress ? t("common.save") : t("settings.addAddress")}</Button>
          </div>
        </form>
      </Modal>
    </DashboardPageContent>
  );
}

type CompanyInfoDetailProps = {
  label: string;
  value: string;
};

function CompanyInfoDetail({ label, value }: CompanyInfoDetailProps) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 sm:[&:nth-last-child(-n+2)]:pb-0 sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-slate-100 sm:[&:nth-child(n+3)]:pt-5">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold leading-6 text-slate-900">{value}</dd>
    </div>
  );
}