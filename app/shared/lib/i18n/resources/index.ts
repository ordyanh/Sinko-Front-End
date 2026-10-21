import { en } from "./en";
import { ru } from "./ru";
import { hy } from "./hy";
import type { Language, TranslationResources } from "../types";

export const resources: Record<Language, TranslationResources> = {
  en,
  ru,
  hy,
};

export function getResource(lang: Language): TranslationResources {
  return resources[lang] ?? resources.ru ?? resources.en;
}

export { en, ru, hy };
