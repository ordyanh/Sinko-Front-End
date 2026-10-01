import Button from "~/shared/ui/button";
import Modal from "~/shared/ui/modal";
import type { ManagedEmployee } from "../model/employee-management";

type DeleteEmployeeModalProps = {
  employee: ManagedEmployee | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteEmployeeModal({
  employee,
  isOpen,
  onClose,
  onConfirm,
}: DeleteEmployeeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      title="Delete employee?"
      description={
        employee
          ? `This will permanently remove ${employee.name} from the employee list.`
          : undefined
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">
          This action cannot be undone.
        </p>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          <Button type="button" variant="ghost" className="w-full sm:w-32" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            className="w-full rounded-md bg-red-600 px-6 py-3 text-base font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 sm:w-32"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
