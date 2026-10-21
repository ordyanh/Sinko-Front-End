import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import Button from "~/shared/ui/button";
import { FieldError, Input, Select } from "~/shared/ui/form";
import Modal from "~/shared/ui/modal";
import { useTranslation } from "~/shared/lib/i18n";
import {
  employeeFormSchema,
  getEmployeeFormDefaults,
  supplierEmployeeRoleOptions,
  yerevanRegionOptions,
  type EmployeeCompanyType,
  type EmployeeFormValues,
  type ManagedEmployee,
} from "../model/employee-management";

type EmployeeFormModalProps = {
  employee?: ManagedEmployee;
  companyType: EmployeeCompanyType;
  isOpen: boolean;
  onClose: () => void;
  onSave: SubmitHandler<EmployeeFormValues>;
};

export default function EmployeeFormModal({
  employee,
  companyType,
  isOpen,
  onClose,
  onSave,
}: EmployeeFormModalProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(employee);
  const isSupplier = companyType === "supplier";
  const defaults = getEmployeeFormDefaults(employee);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      ...defaults,
      role: isSupplier
        ? defaults.role || "Sales Manager"
        : "Purchasing Employee",
      location: isSupplier
        ? defaults.location || yerevanRegionOptions[0]
        : "Not assigned",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const currentDefaults = getEmployeeFormDefaults(employee);
      form.reset({
        ...currentDefaults,
        role: isSupplier
          ? currentDefaults.role || "Sales Manager"
          : "Purchasing Employee",
        location: isSupplier
          ? currentDefaults.location || yerevanRegionOptions[0]
          : "Not assigned",
      });
    }
  }, [isOpen, employee, isSupplier, form]);
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <Modal
      isOpen={isOpen}
      title={isEditing ? t("employees.editEmployee", "Edit employee") : t("employees.addEmployee", "Add employee")}
      description={
        isEditing
          ? t("employees.updateEmployeeDetails", "Update this employee's details.")
          : t("employees.addEmployeeDetails", "Add the employee details used to manage access and availability.")
      }
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={form.handleSubmit(onSave)}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="firstName"
            label={t("employees.firstName", "First name")}
            autoComplete="given-name"
            errorMessage={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            id="lastName"
            label={t("employees.lastName", "Last name")}
            autoComplete="family-name"
            errorMessage={errors.lastName?.message}
            {...register("lastName")}
          />
          <Input
            id="email"
            type="email"
            label={t("common.email", "Email address")}
            autoComplete="email"
            errorMessage={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="phoneNumber"
            type="tel"
            label={t("common.phone", "Phone number")}
            placeholder="+374 00 000000"
            errorMessage={errors.phoneNumber?.message}
            {...register("phoneNumber")}
          />
          {isSupplier ? (
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-900"
                htmlFor="role"
              >
                {t("employees.role", "Role")}
              </label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    error={Boolean(errors.role)}
                    id="role"
                    name={field.name}
                    onBlur={field.onBlur}
                    onValueChange={field.onChange}
                    ref={field.ref}
                    value={field.value}
                  >
                    {supplierEmployeeRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                )}
              />
              <FieldError message={errors.role?.message} />
            </div>
          ) : null}
          {isSupplier ? (
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-900"
                htmlFor="location"
              >
                {t("employees.location", "Region")}
              </label>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <Select
                    creatable
                    createLabel={(region) => `Add region \"${region}\"`}
                    error={Boolean(errors.location)}
                    id="location"
                    name={field.name}
                    onBlur={field.onBlur}
                    onValueChange={field.onChange}
                    ref={field.ref}
                    value={field.value}
                  >
                    {yerevanRegionOptions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </Select>
                )}
              />
              <FieldError message={errors.location?.message} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-32"
            onClick={onClose}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button type="submit" className="w-full sm:w-40">
            {isEditing ? t("common.saveChanges", "Save changes") : t("employees.addEmployee", "Add employee")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
