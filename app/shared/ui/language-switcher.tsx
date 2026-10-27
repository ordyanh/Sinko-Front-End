import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation, type Language } from "~/shared/lib/i18n";

type LanguageOption = {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
};

const languages: LanguageOption[] = [
  { code: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
  { code: "hy", label: "Armenian", nativeLabel: "Հայերեն", flag: "🇦🇲" },
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
];

type LanguageSwitcherProps = {
  variant?: "dropdown" | "pills";
  className?: string;
};

export default function LanguageSwitcher({
  variant = "dropdown",
  className = "",
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption =
    languages.find((lang) => lang.code === language) ?? languages[0];

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

  if (variant === "pills") {
    return (
      <div
        className={`inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-semibold ${className}`}
        role="group"
        aria-label="Language selection"
      >
        {languages.map((item) => {
          const isSelected = item.code === language;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                isSelected
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
              aria-pressed={isSelected}
            >
              <span>{item.flag}</span>
              <span>{item.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-xs transition hover:bg-slate-50 hover:text-slate-950 focus:outline-hidden focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        <span className="text-sm leading-none">{currentOption.flag}</span>
        <span className="font-medium">{currentOption.nativeLabel}</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 z-50 mt-1.5 w-44 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-900/10 focus:outline-hidden animate-in fade-in-50 zoom-in-95 duration-100 dark:border-slate-800 dark:bg-slate-900"
        >
          {languages.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                  isSelected
                    ? "bg-slate-100 font-semibold text-primary dark:bg-slate-800"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{item.flag}</span>
                  <div>
                    <p className="leading-tight">{item.nativeLabel}</p>
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
