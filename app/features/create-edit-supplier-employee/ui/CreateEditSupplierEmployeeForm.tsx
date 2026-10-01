import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import type { BaseEmployee } from "~/entities/employee";
import {
  supplierEmployeeRoleLabels,
  supplierEmployeeRoleValues,
  type SupplierEmployeeRole,
} from "~/entities/supplier/model/supplier";
import { useRegions } from "~/entities/dictonary/hooks/use-regions";
import type { CompanyType } from "~/entities/company/models/company";
import {
  supplierEmployeeFormSchema,
  type SupplierEmployeeFormValues,
} from "../model/schema";
import Button from "~/shared/ui/button";
import { FieldError, Input, Select } from "~/shared/ui/form";

interface CreateEditSupplierEmployeeFormProps {
  onSubmit: SubmitHandler<SupplierEmployeeFormValues>;
  onCancel: () => void;
  employee?: BaseEmployee<CompanyType.Supplier, SupplierEmployeeRole>;
}

export const CreateEditSupplierEmployeeForm = ({
  onSubmit,
  onCancel,
  employee,
}: CreateEditSupplierEmployeeFormProps) => {
  const { regions, isLoading: isRegionsLoading } = useRegions();
  const form = useForm<SupplierEmployeeFormValues>({
    mode: "onBlur",
    resolver: zodResolver(supplierEmployeeFormSchema),
    defaultValues: {
      email: employee?.email ?? "",
      phoneNumber: "",
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      role: employee?.role ?? "SalesManager",
      regionIds: employee?.regionIds ?? [],
    },
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="firstName"
          label="First Name"
          placeholder="Arman"
          errorMessage={errors.firstName?.message}
          {...register("firstName")}
          aria-invalid={errors.firstName ? "true" : "false"}
        />

        <Input
          id="lastName"
          label="Last Name"
          placeholder="Hakobyan"
          errorMessage={errors.lastName?.message}
          {...register("lastName")}
          aria-invalid={errors.lastName ? "true" : "false"}
        />
        <Input
          id="phoneNumber"
          type="tel"
          label="Phone Number"
          placeholder="+374 00 000000"
          errorMessage={errors.phoneNumber?.message}
          {...register("phoneNumber")}
          aria-invalid={errors.phoneNumber ? "true" : "false"}
        />

        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-900"
            htmlFor="role"
          >
            Position
          </label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                id="role"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={(nextValue) => {
                  const value = Array.isArray(nextValue)
                    ? (nextValue[0] ?? "")
                    : nextValue;
                  field.onChange(value);
                }}
                error={Boolean(errors.role)}
              >
                {supplierEmployeeRoleValues.map((roleValue) => (
                  <option key={roleValue} value={roleValue}>
                    {supplierEmployeeRoleLabels[roleValue]}
                  </option>
                ))}
              </Select>
            )}
          />
          <FieldError message={errors.role?.message} />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-900"
            htmlFor="regionIds"
          >
            Service Areas
          </label>
          <Controller
            control={control}
            name="regionIds"
            render={({ field }) => (
              <Select
                id="regionIds"
                name={field.name}
                multiple
                ref={field.ref}
                onBlur={field.onBlur}
                value={(field.value ?? []).map(String)}
                onValueChange={(nextValues) => {
                  const values = Array.isArray(nextValues)
                    ? nextValues
                    : [nextValues];
                  field.onChange(
                    values
                      .map(Number)
                      .filter((value) => Number.isInteger(value) && value > 0),
                  );
                }}
                error={Boolean(errors.regionIds)}
                disabled={isRegionsLoading || regions.length === 0}
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </Select>
            )}
          />
          <FieldError message={errors.regionIds?.message} />
        </div>

        <Input
          id="email"
          type="email"
          label="Email Address"
          placeholder="employee@supplier.am"
          disabled={Boolean(employee)}
          errorMessage={errors.email?.message}
          {...register("email")}
          aria-invalid={errors.email ? "true" : "false"}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-32"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-48">
          {employee ? "Save changes" : "Save"}
        </Button>
      </div>
    </form>
  );
};
