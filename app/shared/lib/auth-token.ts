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

export const DEFAULT_SUPPLIER_DEV_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjBmZmY0YTQ1LTdmMjgtNDY4Yi1hYjUzLTRiZjlkNjkyYjgwZSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6InVzZXJfMDI1ODE4OTlfMTU0QHRlc3QuYW0iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiIyIiwic3ViIjoiMGZmZjRhNDUtN2YyOC00NjhiLWFiNTMtNGJmOWQ2OTJiODBlIiwiZW1haWwiOiJ1c2VyXzAyNTgxODk5XzE1NEB0ZXN0LmFtIiwiRW1wbG95ZWVJZCI6ImZlYjNjNGI1LWZkN2QtNGRlNS04MWVkLTg0YzhjYjllODYwZCIsIkVtcGxveWVlUm9sZSI6IlN1cGVyQWRtaW4iLCJVc2VyUm9sZSI6IjIiLCJSb2xlIjoiMiIsImlzcyI6IkhvcmVjYUF1dGgiLCJhdWQiOiJIb3JlY2FBdXRoIiwibmJmIjoxNzkxMzUyMzc2LCJleHAiOjE4MjI4ODg0MzZ9.IcjCGp6Y5ZFcSH7eVDN52DoUlZHfSxMszrD1vbe-XVg";

// Reads the token from document.cookie or localStorage; returns default dev token if unset.
export function getClientAuthToken(): string | null {
  if (typeof document === "undefined") return DEFAULT_SUPPLIER_DEV_TOKEN;
  const cookieToken = getAuthTokenFromCookieHeader(document.cookie);
  if (cookieToken) return cookieToken;

  try {
    if (typeof localStorage !== "undefined") {
      const stored =
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        null;
      if (stored) return stored;
    }
  } catch {
    // ignore
  }

  return DEFAULT_SUPPLIER_DEV_TOKEN;
}

export function setClientAuthToken(token: string): void {
  if (typeof document !== "undefined") {
    document.cookie = serializeAuthTokenCookie(token);
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  } catch {
    // ignore
  }
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
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
    }
  } catch {
    // ignore
  }
  return `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export type JwtPayload = {
  sub?: string;
  nameid?: string;
  email?: string;
  role?: string;
  UserRole?: string;
  EmployeeRole?: string;
  EmployeeId?: string;
  [key: string]: unknown;
};

export function getDecodedAuthToken(): JwtPayload | null {
  const token = getClientAuthToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCurrentUserEmployeeRole(): string | null {
  const payload = getDecodedAuthToken();
  if (!payload) return null;
  return (
    (payload.EmployeeRole as string) ??
    (payload.employeeRole as string) ??
    null
  );
}

export function getCurrentUserRole(): "Client" | "Supplier" | null {
  const payload = getDecodedAuthToken();
  if (!payload) return null;
  const role =
    (payload.UserRole as string) ??
    (payload.userRole as string) ??
    (payload.role as string) ??
    "";
  if (role.toLowerCase() === "client" || role.toLowerCase() === "horeca") return "Client";
  if (role.toLowerCase() === "supplier") return "Supplier";
  return null;
}
