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

export type JwtPayload = {
  sub?: string;
  nameid?: string;
  email?: string;
  role?: string;
  UserRole?: string;
  EmployeeRole?: string;
  EmployeeId?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  [key: string]: unknown;
};

export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAuthTokenExpired(token?: string | null): boolean {
  if (!token || typeof token !== "string") return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp === "number") {
    return payload.exp * 1000 <= Date.now();
  }
  return false;
}

export function clearClientAuthToken(): void {
  const clearedCookie = clearAuthTokenCookie();
  if (typeof document !== "undefined") {
    document.cookie = clearedCookie;
  }
}

export function clearIndexedDbActiveSession(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open("synko-mvp");
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("session")) {
          db.close();
          resolve();
          return;
        }
        try {
          const tx = db.transaction("session", "readwrite");
          tx.objectStore("session").delete("active-user");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

let isRedirectingToLogin = false;

export function handleUnauthorizedSession(): void {
  clearClientAuthToken();
  void clearIndexedDbActiveSession();

  if (typeof window !== "undefined") {
    const pathname = window.location.pathname.toLowerCase();
    const isPublicAuthRoute =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/register-horeca" ||
      pathname === "/register-supplier";

    if (!isPublicAuthRoute && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      window.location.replace("/login");
      setTimeout(() => {
        isRedirectingToLogin = false;
      }, 2000);
    }
  }
}

// Reads the token from document.cookie or localStorage; clears and returns null if missing or expired.
export function getClientAuthToken(): string | null {
  if (typeof document === "undefined") return null;

  let rawToken: string | null = getAuthTokenFromCookieHeader(document.cookie);

  if (!rawToken) {
    try {
      if (typeof localStorage !== "undefined") {
        rawToken =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("accessToken") ||
          null;
      }
    } catch {
      // ignore
    }
  }

  if (!rawToken || rawToken === DEFAULT_SUPPLIER_DEV_TOKEN) {
    if (rawToken === DEFAULT_SUPPLIER_DEV_TOKEN) {
      clearClientAuthToken();
    }
    return null;
  }

  if (isAuthTokenExpired(rawToken)) {
    handleUnauthorizedSession();
    return null;
  }

  return rawToken;
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

export function getDecodedAuthToken(): JwtPayload | null {
  const token = getClientAuthToken();
  return decodeJwtPayload(token);
}

const EMPLOYEE_ROLE_MAP: Record<string, string> = {
  "1": "Admin",
  "2": "SuperAdmin",
  "3": "PurchasingManager",
  "4": "SalesManager",
  "5": "PurchasingEmployee",
  "6": "WarehouseManager",
  "7": "DeliveryManager",
  "8": "Accountant",
  "9": "FinanceManager",
  "10": "CustomerSupport",
};

export function normalizeEmployeeRole(rawRole: unknown): string | null {
  if (rawRole == null) return null;
  const str = String(rawRole).trim();
  if (EMPLOYEE_ROLE_MAP[str]) return EMPLOYEE_ROLE_MAP[str];
  return str;
}

export function getCurrentUserEmployeeRole(): string | null {
  const payload = getDecodedAuthToken();
  if (!payload) return null;
  const rawRole =
    payload.EmployeeRole ??
    payload.employeeRole ??
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
    null;
  return normalizeEmployeeRole(rawRole);
}

export function isSupplierAdmin(role?: string | null): boolean {
  const r = role ?? getCurrentUserEmployeeRole();
  return r === "Admin" || r === "SuperAdmin";
}

export function isSalesManager(role?: string | null): boolean {
  const r = role ?? getCurrentUserEmployeeRole();
  return r === "SalesManager";
}

export function isWarehouseManager(role?: string | null): boolean {
  const r = role ?? getCurrentUserEmployeeRole();
  return r === "WarehouseManager";
}

export function getAccessibleSupplierModules(role?: string | null): string[] {
  const r = role ?? getCurrentUserEmployeeRole();
  if (!r || isSupplierAdmin(r)) {
    return [
      "dashboard",
      "orders",
      "products",
      "customers",
      "employees",
      "promotions",
      "settings",
      "analytics",
      "reports",
      "notifications",
      "subscription",
      "company"
    ];
  }
  if (r === "SalesManager") {
    return ["orders", "products", "customers", "notifications"];
  }
  if (r === "WarehouseManager") {
    return ["orders", "notifications"];
  }
  if (r === "DeliveryManager") {
    return ["orders", "notifications"];
  }
  if (r === "Accountant" || r === "FinanceManager") {
    return ["orders", "customers", "subscription", "analytics", "reports", "notifications"];
  }
  if (r === "CustomerSupport") {
    return ["orders", "products", "customers", "promotions", "notifications"];
  }
  return ["orders"];
}

export function canAccessModule(moduleName: string, role?: string | null): boolean {
  const modules = getAccessibleSupplierModules(role);
  return modules.includes(moduleName.toLowerCase());
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
