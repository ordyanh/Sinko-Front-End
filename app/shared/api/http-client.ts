import axios, { AxiosError, type AxiosInstance } from "axios";
import { resolveRequestUrl } from "./http";
import { ApiError } from "./http";
import { getClientAuthToken } from "../lib/auth-token";

type ApiErrorPayload = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

function getErrorMessage(payload: ApiErrorPayload | null, status: number) {
  if (payload?.message) return payload.message;
  if (payload?.detail) return payload.detail;
  if (payload?.title) return payload.title;

  const fieldErrors = payload?.errors
    ? Object.values(payload.errors).flat().filter(Boolean)
    : [];

  if (fieldErrors.length > 0) return fieldErrors.join(" ");

  return status >= 500
    ? "The service is temporarily unavailable. Please try again."
    : "The request could not be completed.";
}

function toApiError(error: unknown): unknown {
  if (!(error instanceof AxiosError)) return error;

  const status = error.response?.status ?? 0;
  const payload = (error.response?.data ?? null) as ApiErrorPayload | null;

  return new ApiError(getErrorMessage(payload, status), status);
}

function withUrlResolution(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    config.url = resolveRequestUrl(config.url ?? "");
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(toApiError(error)),
  );
}

// For unauthenticated requests (login, register, public dictionaries, etc).
export const publicApiClient = axios.create();
withUrlResolution(publicApiClient);

// Adds `Authorization: Bearer <token>` automatically in the browser (token read from
// the auth cookie). On the server, pass the token explicitly via request config,
// e.g. `protectedApiClient.get(url, { headers: { Authorization: \`Bearer ${token}\` } })`.
export const protectedApiClient = axios.create();
withUrlResolution(protectedApiClient);
protectedApiClient.interceptors.request.use((config) => {
  if (!config.headers.has("Authorization")) {
    const token = getClientAuthToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});
