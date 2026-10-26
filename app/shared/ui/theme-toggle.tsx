import { useEffect, useRef, useState } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "~/shared/lib/theme";
import { useTranslation } from "~/shared/lib/i18n";

type ThemeToggleProps = {
  variant?: "button" | "dropdown";
  className?: string;
};

export default function ThemeToggle({
  variant = "button",
  className = "",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isDark = resolvedTheme === "dark";

  if (variant === "button") {
    return (
      <button
        id="theme-toggle-button"
        type="button"
        onClick={toggleTheme}
        className={`group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-amber-400 ${className}`}
        aria-label={t("common.toggleTheme", "Toggle theme")}
        title={
          isDark
            ? `${t("common.themeDark")} → ${t("common.themeLight")}`
            : `${t("common.themeLight")} → ${t("common.themeDark")}`
        }
      >
        <Sun
          className={`h-5 w-5 transition-transform duration-300 ${
            isDark
              ? "rotate-0 scale-100 text-amber-400"
              : "-rotate-90 scale-0 opacity-0 absolute"
          }`}
          aria-hidden="true"
        />
        <Moon
          className={`h-5 w-5 transition-transform duration-300 ${
            isDark
              ? "rotate-90 scale-0 opacity-0 absolute"
              : "rotate-0 scale-100 text-slate-600 group-hover:text-primary"
          }`}
          aria-hidden="true"
        />
      </button>
    );
  }

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "light", label: t("common.themeLight", "Light"), icon: Sun },
    { value: "dark", label: t("common.themeDark", "Dark"), icon: Moon },
    { value: "system", label: t("common.themeSystem", "System"), icon: Laptop },
  ];

  const CurrentIcon =
    theme === "system" ? Laptop : isDark ? Moon : Sun;

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        id="theme-dropdown-button"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-xs transition hover:bg-slate-50 hover:text-slate-950 focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("common.theme", "Theme")}
      >
        <CurrentIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <span className="capitalize">
          {theme === "system"
            ? t("common.themeSystem", "System")
            : isDark
              ? t("common.themeDark", "Dark")
              : t("common.themeLight", "Light")}
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("common.theme", "Theme")}
          className="absolute right-0 z-50 mt-2 min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg backdrop-blur-xs transition dark:border-slate-800 dark:bg-slate-900"
        >
          {options.map((option) => {
            const isSelected = theme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? "bg-primary/10 font-bold text-primary dark:bg-primary/20"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{option.label}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
