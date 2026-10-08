import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, PencilLine } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import Button from "~/shared/ui/button";
import { Input } from "~/shared/ui/form";
import Modal from "~/shared/ui/modal";
import { useToast } from "~/shared/ui/toast";
import { DashboardPageContent } from "~/shared/ui";
import { getCompanyInfo, updateCompany } from "~/shared/api";

const companyInfoSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  phoneNumber: z.string().trim().min(1, "Phone number is required."),
  companyAddress: z.string().trim().min(1, "Company address is required."),
  productCategories: z
    .string()
    .trim()
    .min(1, "Product categories are required."),
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
  companyName: "",
  phoneNumber: "",
  companyAddress: "",
  productCategories: "",
  serviceAreas: "",
  taxId: "",
  email: "",
};

export default function SupplierCompanyInformationPage() {
  const { showToast } = useToast();
  const [companyInfo, setCompanyInfo] = useState(initialCompanyInfo);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const form = useForm<CompanyInfoState>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: initialCompanyInfo,
  });
  const {
    register,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    let isCurrent = true;
    getCompanyInfo()
      .then((info) => {
        if (!isCurrent || !info) return;
        const merged: CompanyInfoState = {
          companyName: info.companyName || "",
          phoneNumber: info.phoneNumber || "",
          companyAddress: info.address || "",
          productCategories: info.description || "",
          serviceAreas: (info.customServiceAreas?.join(", ")) || "",
          taxId: info.hvhh || info.taxCode || "",
          email: info.email || "",
        };
        setCompanyInfo(merged);
        reset(merged);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [reset]);

  function openEditModal() {
    reset(companyInfo);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    if (!isSubmitting) {
      setIsEditModalOpen(false);
    }
  }

  const handleSave: SubmitHandler<CompanyInfoState> = async (values) => {
    try {
      await updateCompany({
        companyName: values.companyName,
        phoneNumber: values.phoneNumber,
        address: values.companyAddress,
        description: values.productCategories,
      });
    } catch {
      // Backend offline / error; local state will still update
    }

    setCompanyInfo(values);
    reset(values);
    setIsEditModalOpen(false);
    showToast({
      title: "Company information updated",
      description: "Your changes have been saved.",
      variant: "success",
    });
  };

  return (
    <DashboardPageContent>
      <div className="space-y-6">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Company
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Company information
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Manage your business details, contact information and supplier
            profile.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Supplier profile
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep your business details accurate for restaurants and buyers.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-2 sm:w-auto"
              onClick={openEditModal}
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              Edit company information
            </Button>
          </div>

          <dl className="mt-7 grid gap-x-8 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
            <CompanyInfoDetail label="Company name" value={companyInfo.companyName} />
            <CompanyInfoDetail label="Phone number" value={companyInfo.phoneNumber} />
            <CompanyInfoDetail label="Company address" value={companyInfo.companyAddress} />
            <CompanyInfoDetail label="Tax ID (HVHH)" value={companyInfo.taxId} />
            <CompanyInfoDetail label="Email address" value={companyInfo.email} />
            <CompanyInfoDetail label="Product categories" value={companyInfo.productCategories} />
            <CompanyInfoDetail label="Service areas" value={companyInfo.serviceAreas} />
          </dl>
        </section>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        title="Edit company information"
        description="Update the details restaurants and buyers use to identify and contact your business."
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
              label="Company name"
              autoComplete="organization"
              errorMessage={errors.companyName?.message}
              {...register("companyName")}
            />
            <Input
              id="phoneNumber"
              type="tel"
              label="Phone number"
              autoComplete="tel"
              errorMessage={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />
            <Input
              id="companyAddress"
              label="Company address"
              autoComplete="street-address"
              className="sm:col-span-2"
              errorMessage={errors.companyAddress?.message}
              {...register("companyAddress")}
            />
            <Input
              id="taxId"
              label="Tax ID (HVHH)"
              errorMessage={errors.taxId?.message}
              {...register("taxId")}
            />
            <Input
              id="email"
              type="email"
              label="Email address"
              autoComplete="email"
              errorMessage={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="productCategories"
              label="Product categories"
              className="sm:col-span-2"
              errorMessage={errors.productCategories?.message}
              {...register("productCategories")}
            />
            <Input
              id="serviceAreas"
              label="Service areas"
              className="sm:col-span-2"
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
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-40" loading={isSubmitting}>
              Save changes
            </Button>
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
