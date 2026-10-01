import { getClientAuthToken } from "../lib/auth-token";

type ApiErrorPayload = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

const getEnvVar = (key: string) => {
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
};

const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

export const LOCAL_AUTH_URL = "http://localhost:5273/";
export const LOCAL_CORE_URL = "http://localhost:5206/";
export const REMOTE_AUTH_URL =
  "https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net";
export const REMOTE_CORE_URL =
  "https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net";

export const getBackendTarget = (): "local" | "remote" => {
  const target = getEnvVar("VITE_BACKEND_TARGET");
  return (target || "local").toLowerCase() === "remote" ? "remote" : "local";
};

export const isLocalBackend = (): boolean => getBackendTarget() === "local";

export const SYNCO_BASE_URL = normalizeUrl(
  (isLocalBackend()
    ? getEnvVar("VITE_LOCAL_CORE_URL") || LOCAL_CORE_URL
    : getEnvVar("VITE_REMOTE_CORE_URL")) ||
  getEnvVar("VITE_CORE_API_URL") ||
  REMOTE_CORE_URL
);

export const AUTH_BASE_URL = normalizeUrl(
  (isLocalBackend()
    ? getEnvVar("VITE_LOCAL_AUTH_URL") || LOCAL_AUTH_URL
    : getEnvVar("VITE_REMOTE_AUTH_URL")) ||
  getEnvVar("VITE_AUTH_API_URL") ||
  REMOTE_AUTH_URL
);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const getErrorMessage = (payload: ApiErrorPayload | null, status: number) => {
  if (payload?.message) return payload.message;
  if (payload?.detail) return payload.detail;
  if (payload?.title) return payload.title;

  const fieldErrors = payload?.errors
    ? Object.values(payload.errors).flat().filter(Boolean)
    : [];

  if (fieldErrors.length > 0) {
    return fieldErrors.join(" ");
  }

  return status >= 500
    ? "The service is temporarily unavailable. Please try again."
    : "The request could not be completed.";
};

const withBaseUrl = (baseUrl: string, path: string) => {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export const isAuthEndpoint = (path: string) => {
  const cleanPath = path.toLowerCase();
  return (
    cleanPath.startsWith("/api/auth") ||
    cleanPath.startsWith("/api/company") ||
    cleanPath.startsWith("/api/employee") ||
    cleanPath.startsWith("/api/supplier/register") ||
    cleanPath.startsWith("/api/supplier/verify") ||
    cleanPath.startsWith("/api/supplier/resend-code") ||
    cleanPath.startsWith("/api/verification-request") ||
    cleanPath.startsWith("/api/auth/complete-onboarding") ||
    cleanPath.startsWith("/api/me") ||
    cleanPath.startsWith("/me")
  );
};

export const resolveRequestUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // In the browser, keep relative paths for `/api/...` to use the Vite/Express dev/prod proxy
  // which prevents CORS errors.
  if (typeof window !== "undefined") {
    return path.startsWith("/") ? path : `/${path}`;
  }

  // On the server (SSR), use direct Azure endpoints:
  if (isAuthEndpoint(path)) {
    return withBaseUrl(AUTH_BASE_URL, path);
  }

  return withBaseUrl(SYNCO_BASE_URL, path);
};

export async function apiRequest<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const token = getClientAuthToken();
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(resolveRequestUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    throw new ApiError(
      getErrorMessage(payload, response.status),
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as TResponse;
  }

  return undefined as TResponse;
}
