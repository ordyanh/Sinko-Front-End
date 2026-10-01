// Isomorphic helpers for the auth token cookie: usable in loaders/actions (server) and browser code.
export const AUTH_TOKEN_COOKIE = "auth_token";

const isProduction =
  typeof process !== "undefined" && process.env.NODE_ENV === "production";

export function getAuthTokenFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_TOKEN_COOKIE}=`));

  if (!match) return null;

  const value = match.slice(AUTH_TOKEN_COOKIE.length + 1);
  return value ? decodeURIComponent(value) : null;
}

// Reads the token from document.cookie; returns null when called on the server.
export function getClientAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  return getAuthTokenFromCookieHeader(document.cookie);
}

export function serializeAuthTokenCookie(
  token: string,
  maxAgeSeconds = 60 * 60 * 24 * 7,
): string {
  const parts = [
    `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];

  if (isProduction) parts.push("Secure");

  return parts.join("; ");
}

export function clearAuthTokenCookie(): string {
  return `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
