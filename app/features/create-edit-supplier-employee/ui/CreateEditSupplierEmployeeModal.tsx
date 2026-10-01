import type { BaseEmployee } from "~/entities/employee";
import { CompanyType } from "~/entities/company/models/company";
import Modal from "~/shared/ui/modal";
import type { SupplierEmployeeRole } from "~/entities/supplier/model/supplier";
import type { SubmitHandler } from "react-hook-form";
import type { SupplierEmployeeFormValues } from "../model/schema";
import { CreateEditSupplierEmployeeForm } from "./CreateEditSupplierEmployeeForm";

interface CreateEditSupplierEmployeeModalProps {
  employee?: BaseEmployee<CompanyType.Supplier, SupplierEmployeeRole>;
  isOpen: boolean;
  onSubmit: SubmitHandler<SupplierEmployeeFormValues>;
  onClose: () => void;
}

export const CreateEditSupplierEmployeeModal = ({
  employee,
  isOpen,
  onSubmit,
  onClose,
}: CreateEditSupplierEmployeeModalProps) => {
  const isEditMode = !!employee;
  const modalTitle = isEditMode
    ? "Edit Supplier Employee"
    : "Create Supplier Employee";

  return (
    <Modal isOpen={isOpen} title={modalTitle} onClose={onClose}>
      <CreateEditSupplierEmployeeForm
        employee={employee}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};
