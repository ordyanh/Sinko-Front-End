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
  "https://lobster-app-zhysf.ondigitalocean.app";
export const REMOTE_CORE_URL =
  "https://octopus-app-bomx6.ondigitalocean.app";

export const getBackendTarget = (): "local" | "remote" => {
  const target = getEnvVar("VITE_BACKEND_TARGET");
  if (target) {
    return target.toLowerCase() === "local" ? "local" : "remote";
  }

  // In production builds (DigitalOcean, cloud, or Docker), always default to remote
  const isProduction =
    (typeof import.meta !== "undefined" && Boolean(import.meta.env?.PROD)) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production");

  return isProduction ? "remote" : "local";
};

export const isLocalBackend = (): boolean => getBackendTarget() === "local";

export const getCoreBaseUrl = (): string => {
  const isLocal = isLocalBackend();
  if (isLocal) {
    return normalizeUrl(getEnvVar("VITE_LOCAL_CORE_URL") || LOCAL_CORE_URL);
  }
  return normalizeUrl(
    getEnvVar("VITE_REMOTE_CORE_URL") ||
    getEnvVar("VITE_CORE_API_URL") ||
    REMOTE_CORE_URL
  );
};

export const getAuthBaseUrl = (): string => {
  const isLocal = isLocalBackend();
  if (isLocal) {
    return normalizeUrl(getEnvVar("VITE_LOCAL_AUTH_URL") || LOCAL_AUTH_URL);
  }
  return normalizeUrl(
    getEnvVar("VITE_REMOTE_AUTH_URL") ||
    getEnvVar("VITE_AUTH_API_URL") ||
    REMOTE_AUTH_URL
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

const getActiveLanguage = (): "hy" | "ru" | "en" => {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("synco_app_lang_pref_v1");
    if (stored === "ru" || stored === "en" || stored === "hy") return stored;
  }
  return "hy";
};

export const formatFriendlyErrorMessage = (raw: string, lang = getActiveLanguage()): string => {
  if (!raw || typeof raw !== "string") return raw;
  let clean = raw.replace(/^(SYSTEM_ERROR:\s*|BAD_REQUEST:\s*|ERROR:\s*|Server error:\s*)/i, "").trim();

  // 1. Invalid package quantity error
  if (/Invalid package quantity|packaging options|packaging rules|варианты упаковки|փաթեթավորման/i.test(clean)) {
    const qtyMatch = clean.match(/(?:quantity\s*\(?|total quantity\s*\(?)(\d+(?:\.\d+)?)\)?/i);
    const qty = qtyMatch ? qtyMatch[1] : "";
    const prodMatch = clean.match(/for\s*['"]([^'"]+)['"]/i);
    const prod = prodMatch ? prodMatch[1] : "";
    const optionsMatch = clean.match(/(?:options|варианты|տարբերակներ)[^:]*:\s*([0-9.,\s]+)(?:([a-zA-Zа-яА-Яա-ֆԱ-Ֆ]+))?/i);
    const options = optionsMatch ? optionsMatch[1].trim() : "";
    const unit = optionsMatch && optionsMatch[2] ? optionsMatch[2].trim() : "";

    if (lang === "ru") {
      const prodText = prod ? ` для товара «${prod}»` : "";
      const qtyText = qty ? ` (${qty})` : "";
      const optText = options ? ` Доступные варианты упаковки: ${options}${unit ? ` ${unit}` : ""}.` : "";
      return `Указано недопустимое количество${qtyText}${prodText}.${optText}`;
    }
    if (lang === "hy") {
      const prodText = prod ? `«${prod}» ապրանքի համար ` : "";
      const qtyText = qty ? ` (${qty})` : "";
      const optText = options ? ` Փաթեթավորման հասանելի տարբերակներն են՝ ${options}${unit ? ` ${unit}` : ""}:` : "";
      return `${prodText}նշված քանակն${qtyText} անթույլատրելի է:${optText}`;
    }
    const prodText = prod ? ` for "${prod}"` : "";
    const qtyText = qty ? ` (${qty})` : "";
    const optText = options ? ` Available packaging options: ${options}${unit ? ` ${unit}` : ""}.` : "";
    return `Invalid quantity${qtyText}${prodText}.${optText}`;
  }

  // 2. Quantity must be greater than zero
  if (/greater than zero|больше нуля|մեծ լինի զրոյից/i.test(clean)) {
    if (lang === "ru") return "Количество должно быть больше нуля.";
    if (lang === "hy") return "Քանակը պետք է մեծ լինի զրոյից:";
    return "Quantity must be greater than zero.";
  }

  // 3. Product unavailable / removed
  if (/product_removed|removed by supplier|удален поставщиком|հեռացվել է մատակարարի/i.test(clean)) {
    if (lang === "ru") return "Этот товар был удален поставщиком.";
    if (lang === "hy") return "Այս ապրանքը հեռացվել է մատակարարի կողմից:";
    return "This product was removed by the supplier.";
  }
  if (/product_unavailable|Product unavailable|недоступен|հասանելի չէ/i.test(clean)) {
    if (lang === "ru") return "Выбранный товар в данный момент недоступен.";
    if (lang === "hy") return "Ընտրված ապրանքը ներկայումս հասանելի չէ:";
    return "This product is currently unavailable.";
  }

  // 4. Cart / Order items
  if (/Item not found in cart|не найден в корзине/i.test(clean)) {
    if (lang === "ru") return "Товар не найден в корзине.";
    if (lang === "hy") return "Ապրանքը զամբյուղում չի գտնվել:";
    return "Item not found in cart.";
  }
  if (/Cart is empty|Корзина пуста/i.test(clean)) {
    if (lang === "ru") return "Ваша корзина пуста.";
    if (lang === "hy") return "Ձեր զամբյուղը դատարկ է:";
    return "Your cart is empty.";
  }

  // 5. Auth credentials / unexpected errors
  if (/nothing matching your request|check credentials|неверный логин|неверный адрес/i.test(clean)) {
    if (lang === "ru") return "Неверный адрес эл. почты или пароль. Пожалуйста, проверьте введённые данные.";
    if (lang === "hy") return "Սխալ էլ. փոստ կամ գաղտնաբառ: Խնդրում ենք ստուգել մուտքագրված տվյալները:";
    return "Invalid email or password. Please check your credentials.";
  }
  if (/An unexpected error occurred|INTERNAL_SERVER_ERROR/i.test(clean)) {
    if (lang === "ru") return "Произошла непредвиденная ошибка при обращении к серверу. Пожалуйста, повторите попытку.";
    if (lang === "hy") return "Սերվերի հետ կապի անսպասելի սխալ: Խնդրում ենք նորից փորձել:";
    return "An unexpected error occurred. Please try again.";
  }

  return clean;
};

export const getErrorMessage = (payload: any, status: number): string => {
  const lang = getActiveLanguage();

  if (typeof payload === "string" && payload.trim()) {
    const clean = payload.replace(/<[^>]*>?/gm, "").trim();
    if (clean && clean.length < 300) return formatFriendlyErrorMessage(clean, lang);
  }

  if (payload && typeof payload === "object") {
    // 1. Check validation errors dictionary (e.g. ASP.NET ProblemDetails { errors: { Field: ["error"] } })
    const errObj = payload.errors ?? payload.Errors;
    if (errObj && typeof errObj === "object") {
      const fieldErrors = Object.values(errObj)
        .flat()
        .filter(Boolean)
        .map(String);
      if (fieldErrors.length > 0) {
        return formatFriendlyErrorMessage(fieldErrors.join("; "), lang);
      }
    }

    // 2. Check for error / Error string (OrdersController returns { error: result.Message })
    const errText = payload.error ?? payload.Error;
    if (typeof errText === "string" && errText.trim()) {
      return formatFriendlyErrorMessage(errText.trim(), lang);
    }

    // 3. Check for message / Message string
    const msgText = payload.message ?? payload.Message;
    if (typeof msgText === "string" && msgText.trim()) {
      return formatFriendlyErrorMessage(msgText.trim(), lang);
    }

    // 4. Check for detail / Detail string
    const detailText = payload.detail ?? payload.Detail;
    if (typeof detailText === "string" && detailText.trim()) {
      return formatFriendlyErrorMessage(detailText.trim(), lang);
    }

    // 5. Check for title / Title string
    const titleText = payload.title ?? payload.Title;
    if (typeof titleText === "string" && titleText.trim()) {
      return formatFriendlyErrorMessage(titleText.trim(), lang);
    }
  }

  // HTTP Status-specific fallback messages
  if (status === 400) {
    return lang === "ru"
      ? "Некорректный запрос. Пожалуйста, проверьте введённые данные."
      : lang === "hy"
        ? "Անվավեր հարցում: Խնդրում ենք ստուգել մուտքագրված տվյալները:"
        : "Bad Request: The submitted request data is invalid.";
  }
  if (status === 401) {
    return lang === "ru"
      ? "Пожалуйста, войдите в систему для выполнения этого действия."
      : lang === "hy"
        ? "Խնդրում ենք մուտք գործել համակարգ:"
        : "Unauthorized: Please log in to perform this action.";
  }
  if (status === 403) {
    return lang === "ru"
      ? "У вас нет прав для выполнения этой операции."
      : lang === "hy"
        ? "Դուք չունեք թույլտվություն այս գործողությունը կատարելու համար:"
        : "Forbidden: You do not have permission to perform this action.";
  }
  if (status === 404) {
    return lang === "ru"
      ? "Запрошенный ресурс не найден."
      : lang === "hy"
        ? "Հայցվող ռեսուրսը չի գտնվել:"
        : "Not Found: The requested resource was not found.";
  }
  if (status === 409) {
    return lang === "ru"
      ? "Данные уже были изменены другим процессом. Пожалуйста, обновите страницу."
      : lang === "hy"
        ? "Տվյալներն արդեն փոփոխվել են: Խնդրում ենք թարմացնել էջը:"
        : "Conflict: The resource has already been modified.";
  }
  if (status >= 500) {
    return lang === "ru"
      ? "Сервис временно недоступен. Пожалуйста, повторите попытку через минуту."
      : lang === "hy"
        ? "Ծառայությունը ժամանակավորապես անհասանելի է: Խնդրում ենք փորձել մի փոքր ուշ:"
        : "The service is temporarily unavailable. Please try again shortly.";
  }

  return lang === "ru"
    ? "Не удалось выполнить запрос."
    : lang === "hy"
      ? "Հարցումը չհաջողվեց կատարել:"
      : "The request could not be completed.";
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
