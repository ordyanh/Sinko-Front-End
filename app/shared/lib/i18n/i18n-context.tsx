import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Language, TranslationResources } from "./types";
import { getResource, resources } from "./resources";
import { updateCompanyLanguage } from "~/shared/api";

const STORAGE_KEY = "synco_app_lang_pref_v1";
const DEFAULT_LANGUAGE: Language = "hy";

type TranslationKeyPath = string;
type TranslationParams = Record<string, string | number | undefined | null>;

type I18nContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (
    path: TranslationKeyPath,
    fallbackOrParams?: string | TranslationParams,
    params?: TranslationParams,
  ) => string;
  r: TranslationResources;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveValueByPath(obj: unknown, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === "en" || stored === "ru" || stored === "hy")) {
        return stored;
      }
    }
    return initialLanguage;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === "en" || stored === "ru" || stored === "hy")) {
        if (stored !== language) {
          setLanguageState(stored);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((nextLang: Language) => {
    setLanguageState(nextLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, nextLang);
      } catch {
        // storage disabled or quota exceeded
      }
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLang;
    }

    // Attempt background sync to backend company profile if authenticated
    try {
      void updateCompanyLanguage({ language: nextLang }).catch(() => {
        // Silent catch for unauthenticated or offline states
      });
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (
      path: string,
      fallbackOrParams?: string | TranslationParams,
      paramsArg?: TranslationParams,
    ): string => {
      let fallback: string | undefined;
      let params: TranslationParams | undefined;

      if (typeof fallbackOrParams === "string") {
        fallback = fallbackOrParams;
        params = paramsArg;
      } else if (fallbackOrParams && typeof fallbackOrParams === "object") {
        params = fallbackOrParams;
        fallback = undefined;
      }

      const activeRes = getResource(language);
      let value = resolveValueByPath(activeRes, path);

      // Fallback to English if key missing in active language
      if (!value && language !== "en") {
        value = resolveValueByPath(resources.en, path);
      }

      let result = value ?? fallback ?? path;

      if (params && typeof result === "string") {
        for (const [key, replacement] of Object.entries(params)) {
          if (replacement !== undefined && replacement !== null) {
            result = result.replace(new RegExp(`{${key}}`, "g"), String(replacement));
          }
        }
      }

      return result;
    },
    [language],
  );

  const contextValue: I18nContextValue = {
    language,
    setLanguage,
    t,
    r: getResource(language),
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback for components rendered outside provider
    const fallbackRes = getResource(DEFAULT_LANGUAGE);
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (
        path: string,
        fallbackOrParams?: string | TranslationParams,
        paramsArg?: TranslationParams,
      ) => {
        let fallback: string | undefined;
        let params: TranslationParams | undefined;

        if (typeof fallbackOrParams === "string") {
          fallback = fallbackOrParams;
          params = paramsArg;
        } else if (fallbackOrParams && typeof fallbackOrParams === "object") {
          params = fallbackOrParams;
          fallback = undefined;
        }

        let result = resolveValueByPath(fallbackRes, path) ?? fallback ?? path;
        if (params && typeof result === "string") {
          for (const [key, replacement] of Object.entries(params)) {
            if (replacement !== undefined && replacement !== null) {
              result = result.replace(new RegExp(`{${key}}`, "g"), String(replacement));
            }
          }
        }
        return result;
      },
      r: fallbackRes,
    };
  }
  return ctx;
}
