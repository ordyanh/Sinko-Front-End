import axios, { AxiosError, type AxiosInstance } from "axios";
import { resolveRequestUrl, ApiError, getErrorMessage, type ApiErrorPayload } from "./http";
import { getClientAuthToken } from "../lib/auth-token";

function toApiError(error: unknown): unknown {
  if (!(error instanceof AxiosError)) return error;

  const status = error.response?.status ?? (error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK" ? 502 : 0);
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
