import { apiRequest } from "./http";
import type {
  CreateEmployeeRequest,
  EmployeeRole,
  EmployeeStatus,
  UpdateEmployeeRequest,
} from "./auth";

export type InviteEmployeeRequest = {
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  email?: string | null;
  organizationId?: string | null;
  phoneNumber?: string | null;
  region?: string | null;
  regionId?: number | null;
};

export type EmployeeListItem = {
  id: string;
  firstName?: string;
  lastName?: string;
  employeeName?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  role: EmployeeRole;
  status?: EmployeeStatus;
  regionIds?: number[];
  regionNames?: string[];
  statusStartDate?: string;
  statusEndDate?: string;
};

export async function getEmployeesList(): Promise<EmployeeListItem[]> {
  try {
    const res = await apiRequest<EmployeeListItem[]>("/api/Employee/list", {
      method: "GET",
    });
    return Array.isArray(res) ? res : [];
  } catch {
    const fallback = await apiRequest<EmployeeListItem[]>("/api/Employee", {
      method: "GET",
    });
    return Array.isArray(fallback) ? fallback : [];
  }
}

export async function getEmployeePositions(role?: string): Promise<string[]> {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  const res = await apiRequest<string[]>(`/api/Employee/positions${query}`, {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function createEmployee(
  payload: CreateEmployeeRequest & Partial<InviteEmployeeRequest>,
): Promise<unknown> {
  const body = {
    ...payload,
    position: payload.position ?? (payload.role ? String(payload.role) : undefined),
  };
  return apiRequest<unknown>("/api/Employee/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function inviteEmployee(payload: InviteEmployeeRequest): Promise<unknown> {
  return apiRequest<unknown>("/api/Employee/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(
  id: string,
  payload: UpdateEmployeeRequest,
): Promise<unknown> {
  return apiRequest<unknown>(`/api/Employee/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateEmployeeStatus(
  id: string,
  payload: UpdateEmployeeRequest,
): Promise<unknown> {
  return apiRequest<unknown>(`/api/Employee/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  return apiRequest<void>(`/api/Employee/${id}`, {
    method: "DELETE",
  });
}

export async function disableEmployee(id: string): Promise<void> {
  return apiRequest<void>(`/api/Employee/${id}/disable`, {
    method: "POST",
  });
}
