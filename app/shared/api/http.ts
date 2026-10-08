import { getClientAuthToken } from "../lib/auth-token";

export type ApiErrorPayload = {
  title?: string;
  detail?: string;
  message?: string;
  error?: string;
  Title?: string;
  Detail?: string;
  Message?: string;
  Error?: string;
  errors?: Record<string, string[] | string>;
  Errors?: Record<string, string[] | string>;
};

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (key === "VITE_BACKEND_TARGET") return import.meta.env.VITE_BACKEND_TARGET;
    if (key === "VITE_LOCAL_AUTH_URL") return import.meta.env.VITE_LOCAL_AUTH_URL;
    if (key === "VITE_LOCAL_CORE_URL") return import.meta.env.VITE_LOCAL_CORE_URL;
    if (key === "VITE_REMOTE_AUTH_URL") return import.meta.env.VITE_REMOTE_AUTH_URL;
    if (key === "VITE_REMOTE_CORE_URL") return import.meta.env.VITE_REMOTE_CORE_URL;
    if (key === "VITE_AUTH_API_URL") return import.meta.env.VITE_AUTH_API_URL;
    if (key === "VITE_CORE_API_URL") return import.meta.env.VITE_CORE_API_URL;
    return (import.meta.env as Record<string, string | undefined>)[key];
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

export const LOCAL_AUTH_URL = "http://localhost:5273";
export const LOCAL_CORE_URL = "http://localhost:5206";
export const REMOTE_AUTH_URL =
  "https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net";
export const REMOTE_CORE_URL =
  "https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net";

export const getBackendTarget = (): "local" | "remote" => {
  const target = getEnvVar("VITE_BACKEND_TARGET");
  return (target || "local").toLowerCase() === "remote" ? "remote" : "local";
};

export const isLocalBackend = (): boolean => getBackendTarget() === "local";

export const getCoreBaseUrl = (): string => {
  const isLocal = isLocalBackend();
  return normalizeUrl(
    (isLocal
      ? getEnvVar("VITE_LOCAL_CORE_URL") || LOCAL_CORE_URL
      : getEnvVar("VITE_REMOTE_CORE_URL")) ||
    getEnvVar("VITE_CORE_API_URL") ||
    (isLocal ? LOCAL_CORE_URL : REMOTE_CORE_URL)
  );
};

export const getAuthBaseUrl = (): string => {
  const isLocal = isLocalBackend();
  return normalizeUrl(
    (isLocal
      ? getEnvVar("VITE_LOCAL_AUTH_URL") || LOCAL_AUTH_URL
      : getEnvVar("VITE_REMOTE_AUTH_URL")) ||
    getEnvVar("VITE_AUTH_API_URL") ||
    (isLocal ? LOCAL_AUTH_URL : REMOTE_AUTH_URL)
  );
};

export const SYNCO_BASE_URL = getCoreBaseUrl();
export const AUTH_BASE_URL = getAuthBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const getErrorMessage = (payload: any, status: number): string => {
  if (typeof payload === "string" && payload.trim()) {
    const clean = payload.replace(/<[^>]*>?/gm, "").trim();
    if (clean && clean.length < 300) return clean;
  }

  if (payload && typeof payload === "object") {
    // 1. Check for error / Error string (OrdersController returns { error: result.Message })
    const errText = payload.error ?? payload.Error;
    if (typeof errText === "string" && errText.trim()) {
      return errText.trim();
    }

    // 2. Check for message / Message string
    const msgText = payload.message ?? payload.Message;
    if (typeof msgText === "string" && msgText.trim()) {
      return msgText.trim();
    }

    // 3. Check for detail / Detail string
    const detailText = payload.detail ?? payload.Detail;
    if (typeof detailText === "string" && detailText.trim()) {
      return detailText.trim();
    }

    // 4. Check for title / Title string
    const titleText = payload.title ?? payload.Title;
    if (typeof titleText === "string" && titleText.trim()) {
      return titleText.trim();
    }

    // 5. Check validation errors dictionary
    const errObj = payload.errors ?? payload.Errors;
    if (errObj && typeof errObj === "object") {
      const fieldErrors = Object.values(errObj)
        .flat()
        .filter(Boolean)
        .map(String);
      if (fieldErrors.length > 0) {
        return fieldErrors.join("; ");
      }
    }
  }

  // HTTP Status-specific fallback messages
  if (status === 400) {
    return "Bad Request: The submitted order or request data is invalid.";
  }
  if (status === 401) {
    return "Unauthorized: Please log in to perform this action.";
  }
  if (status === 403) {
    return "Forbidden: You do not have permission to perform this action.";
  }
  if (status === 404) {
    return "Not Found: The requested order or resource was not found.";
  }
  if (status === 409) {
    return "Conflict: The order or resource has already been modified or assigned.";
  }
  if (status === 502) {
    return "Bad Gateway (502): The backend server is temporarily unreachable or starting up. Please try again shortly.";
  }
  if (status === 503) {
    return "Service Unavailable (503): The server is temporarily overloaded or undergoing maintenance. Please try again.";
  }
  if (status === 504) {
    return "Gateway Timeout (504): The server took too long to respond. Please check your connection and try again.";
  }
  if (status >= 500) {
    return "The service is temporarily unavailable. Please try again.";
  }

  return "The request could not be completed.";
};

const withBaseUrl = (baseUrl: string, path: string, fallbackBaseUrl: string) => {
  const cleanBase = (baseUrl || fallbackBaseUrl).replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export const isAuthEndpoint = (path: string): boolean => {
  const cleanPath = (path.startsWith("/") ? path : `/${path}`).toLowerCase();
  return (
    cleanPath.startsWith("/api/auth") ||
    cleanPath.startsWith("/api/company") ||
    cleanPath.startsWith("/api/employee") ||
    cleanPath.startsWith("/api/supplier/register") ||
    cleanPath.startsWith("/api/supplier/verify") ||
    cleanPath.startsWith("/api/supplier/resend-code") ||
    cleanPath.startsWith("/api/verification-request") ||
    cleanPath.startsWith("/api/auth/complete-onboarding") ||
    cleanPath === "/api/me" ||
    cleanPath.startsWith("/api/me?") ||
    cleanPath.startsWith("/api/me/") ||
    cleanPath === "/me" ||
    cleanPath.startsWith("/me?") ||
    cleanPath.startsWith("/me/")
  );
};

export const resolveRequestUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const isLocal = isLocalBackend();
  const fallbackAuth = isLocal ? LOCAL_AUTH_URL : REMOTE_AUTH_URL;
  const fallbackCore = isLocal ? LOCAL_CORE_URL : REMOTE_CORE_URL;

  // Always resolve directly to target backend (AuthService: 5273 or Core: 5206)
  if (isAuthEndpoint(path)) {
    return withBaseUrl(getAuthBaseUrl(), path, fallbackAuth);
  }

  return withBaseUrl(getCoreBaseUrl(), path, fallbackCore);
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

  let response: Response;
  try {
    response = await fetch(resolveRequestUrl(path), {
      ...init,
      headers,
    });
  } catch (networkError) {
    const errorMsg =
      networkError instanceof Error ? networkError.message : "Network error";
    throw new ApiError(
      `Bad Gateway (502): Unable to connect to the backend server (${errorMsg}). Please ensure the service is running.`,
      502,
    );
  }

  if (!response.ok) {
    let payload: any = null;

    try {
      const text = await response.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text && !text.toLowerCase().includes("<html") ? text : null;
      }
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
