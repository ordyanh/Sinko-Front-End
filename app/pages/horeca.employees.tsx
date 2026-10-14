import { CalendarClock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DeleteEmployeeModal,
  EmployeeFormModal,
  EmployeeVacationModal,
  type EmployeeFormValues,
  type ManagedEmployee,
  type VacationFormValues,
} from "~/features/employee-management";
import {
  DashboardTableContent,
  TableLayout,
  type TableColumn,
  type SearchFilterDefinition,
  type SearchFilterValue,
} from "~/shared/ui";
import {
  createEmployeeId,
  deleteEmployee as deleteStoredEmployee,
  getEmployeesForAccount,
  getLoggedInUser,
  saveEmployee as saveStoredEmployee,
} from "~/shared/lib/indexed-db";
import { useTranslation } from "~/shared/lib/i18n";

type HorecaEmployee = ManagedEmployee;

function getHorecaEmployeeSearchFilters(
  employees: HorecaEmployee[],
  t: (key: string, fallback?: string) => string,
): SearchFilterDefinition[] {
  return [
    {
      id: "status",
      label: t("employees.status", "Status"),
      options: Array.from(new Set(employees.map((employee) => employee.status))).map(
        (status) => ({
          value: status,
          label: status === "Active" ? t("employees.active", status) : t("employees.onVacation", status),
        }),
      ),
    },
    {
      id: "location",
      label: t("employees.location", "Location"),
      options: Array.from(new Set(employees.map((employee) => employee.location))).map(
        (location) => ({ value: location, label: location }),
      ),
    },
    {
      id: "role",
      label: t("employees.role", "Role"),
      options: Array.from(new Set(employees.map((employee) => employee.role))).map(
        (role) => ({ value: role, label: role }),
      ),
    },
  ];
}

export default function HorecaEmployeesPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<HorecaEmployee[]>([]);
  const [accountId, setAccountId] = useState<string>();
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterValue[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<HorecaEmployee>();
  const [employeeOnVacation, setEmployeeOnVacation] =
    useState<HorecaEmployee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<HorecaEmployee | null>(null);

  const columns: TableColumn<HorecaEmployee>[] = useMemo(
    () => [
      {
        id: "employee",
        header: t("employees.fullName"),
        cell: (employee) => (
          <div>
            <p className="font-semibold text-slate-900">{employee.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{employee.email}</p>
          </div>
        ),
      },
      { id: "role", header: t("employees.role"), cell: (employee) => employee.role },
      {
        id: "status",
        header: t("employees.status"),
        cell: (employee) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              employee.status === "Active"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {employee.status === "Active" ? t("employees.active") : t("employees.onVacation")}
          </span>
        ),
      },
    ],
    [t],
  );

  const horecaEmployeeSearchFilters = useMemo(
    () => getHorecaEmployeeSearchFilters(employees, t),
    [employees, t],
  );

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!isActive || user?.role !== "horeca") return;

      const storedEmployees = await getEmployeesForAccount(user.id);
      if (!isActive) return;

      setAccountId(user.id);
      setEmployees(storedEmployees);
    })();

    return () => {
      isActive = false;
    };
  }, []);
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = [
      employee.id,
      employee.name,
      employee.email,
      employee.role,
      employee.location,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchValue);
    const employeeValue = (filter: SearchFilterValue) => {
      if (filter.filterId === "status") return employee.status;
      if (filter.filterId === "location") return employee.location;
      return employee.role;
    };
    const matchesFilters = selectedFilters.every((filter) => {
      const doesMatch = employeeValue(filter) === filter.value;

      return filter.operator === "is" ? doesMatch : !doesMatch;
    });

    return matchesSearch && matchesFilters;
  });
  const visibleEmployees = filteredEmployees.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPage(1);
  }

  function handleSelectedFiltersChange(filters: SearchFilterValue[]) {
    setSelectedFilters(filters);
    setPage(1);
  }

  function closeEmployeeModal() {
    setIsEmployeeModalOpen(false);
    setEmployeeToEdit(undefined);
  }

  async function saveEmployee(values: EmployeeFormValues) {
    if (!accountId) return;

    const normalizedEmail = values.email.trim().toLowerCase();
    const duplicate = employees.find(
      (e) => e.email.trim().toLowerCase() === normalizedEmail && e.id !== employeeToEdit?.id,
    );
    if (duplicate) {
      window.alert("An employee with this email address already exists.");
      return;
    }

    const name = `${values.firstName} ${values.lastName}`;
    const employee: HorecaEmployee = {
      id: employeeToEdit?.id ?? createEmployeeId(),
      name,
      email: values.email.trim(),
      phoneNumber: values.phoneNumber?.trim() || undefined,
      role: "Purchasing Employee",
      location: employeeToEdit?.location ?? "Not assigned",
      status: employeeToEdit?.status ?? "Active",
      vacationStartDate: employeeToEdit?.vacationStartDate,
      vacationEndDate: employeeToEdit?.vacationEndDate,
    };

    try {
      const saved = await saveStoredEmployee({ ...employee, accountId, accountRole: "horeca" });
      const finalEmployee = saved ? { ...employee, id: saved.id } : employee;
      setEmployees((currentEmployees) =>
        employeeToEdit
          ? currentEmployees.map((currentEmployee) =>
              currentEmployee.id === employee.id ? finalEmployee : currentEmployee,
            )
          : [...currentEmployees.filter((e) => e.email.trim().toLowerCase() !== normalizedEmail), finalEmployee],
      );
      setPage(1);
      closeEmployeeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save employee.";
      window.alert(message);
    }
  }

  async function saveVacation({ startDate, endDate }: VacationFormValues) {
    if (!employeeOnVacation || !accountId) return;

    const employee = {
      ...employeeOnVacation,
      status: "On vacation" as const,
      vacationStartDate: startDate,
      vacationEndDate: endDate,
    };
    const saved = await saveStoredEmployee({ ...employee, accountId, accountRole: "horeca" });
    const finalEmployee = saved ? { ...employee, id: saved.id } : employee;
    setEmployees((currentEmployees) =>
      currentEmployees.map((currentEmployee) =>
        currentEmployee.id === employee.id || currentEmployee.id === employeeOnVacation.id
          ? finalEmployee
          : currentEmployee,
      ),
    );
    setEmployeeOnVacation(null);
  }

  async function deleteEmployee() {
    if (!employeeToDelete || !accountId) return;

    await deleteStoredEmployee(accountId, employeeToDelete.id);
    setEmployees((currentEmployees) =>
      currentEmployees.filter((employee) => employee.id !== employeeToDelete.id),
    );
    setEmployeeToDelete(null);
    setPage(1);
  }

  return (
    <DashboardTableContent>
      <TableLayout
        title={t("employees.title")}
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
        primaryAction={
          <button
            type="button"
            onClick={() => setIsEmployeeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("employees.addEmployee")}
          </button>
        }
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("employees.searchPlaceholder")}
        searchFilters={horecaEmployeeSearchFilters}
        selectedSearchFilters={selectedFilters}
        onSelectedSearchFiltersChange={handleSelectedFiltersChange}
        columns={columns}
        rows={visibleEmployees}
        getRowKey={(employee) => employee.id}
        rowActions={[
          {
            label: t("common.edit"),
            icon: <Pencil aria-hidden="true" />,
            onClick: (employee) => {
              setEmployeeToEdit(employee);
              setIsEmployeeModalOpen(true);
            },
          },
          {
            label: t("employees.setVacation"),
            icon: <CalendarClock aria-hidden="true" />,
            onClick: setEmployeeOnVacation,
          },
          {
            label: t("common.delete"),
            icon: <Trash2 aria-hidden="true" />,
            variant: "danger",
            onClick: setEmployeeToDelete,
          },
        ]}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        totalCount={filteredEmployees.length}
        emptyMessage={t("common.noResults")}
      />
      {isEmployeeModalOpen ? (
        <EmployeeFormModal
          key={employeeToEdit?.id ?? "new"}
          employee={employeeToEdit}
          companyType="horeca"
          isOpen
          onClose={closeEmployeeModal}
          onSave={saveEmployee}
        />
      ) : null}
      {employeeOnVacation ? (
        <EmployeeVacationModal
          key={employeeOnVacation.id}
          employee={employeeOnVacation}
          isOpen
          onClose={() => setEmployeeOnVacation(null)}
          onSave={saveVacation}
        />
      ) : null}
      {employeeToDelete ? (
        <DeleteEmployeeModal
          employee={employeeToDelete}
          isOpen
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={deleteEmployee}
        />
      ) : null}
    </DashboardTableContent>
  );
}
