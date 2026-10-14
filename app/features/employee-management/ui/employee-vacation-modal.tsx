import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { useTranslation } from "~/shared/lib/i18n";
import Button from "~/shared/ui/button";
import { Input } from "~/shared/ui/form";
import Modal from "~/shared/ui/modal";
import {
  vacationFormSchema,
  type ManagedEmployee,
  type VacationFormValues,
} from "../model/employee-management";

type EmployeeVacationModalProps = {
  employee: ManagedEmployee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: SubmitHandler<VacationFormValues>;
};

export default function EmployeeVacationModal({
  employee,
  isOpen,
  onClose,
  onSave,
}: EmployeeVacationModalProps) {
  const { t } = useTranslation();
  const form = useForm<VacationFormValues>({
    resolver: zodResolver(vacationFormSchema),
    defaultValues: {
      startDate: employee?.vacationStartDate ?? "",
      endDate: employee?.vacationEndDate ?? "",
    },
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const startDate = useWatch({ control, name: "startDate" });

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      title={t("employees.setVacation")}
      description={employee ? t("employees.chooseWhenUnavailable").replace("{name}", employee.name) : undefined}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="vacationStartDate"
            type="date"
            label={t("employees.startDate")}
            errorMessage={errors.startDate?.message}
            {...register("startDate")}
          />
          <Input
            id="vacationEndDate"
            type="date"
            label={t("employees.endDate")}
            min={startDate || undefined}
            errorMessage={errors.endDate?.message}
            {...register("endDate")}
          />
        </div>
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {t("employees.vacationNote")}
        </p>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          <Button type="button" variant="ghost" className="w-full sm:w-32" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" className="w-full sm:w-40">
            {t("employees.setVacation")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
