import type {
  DictionaryCategoryOption,
  DictionaryRegionOption,
} from "../model/dictonary";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const extractDictionaryItems = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [
    payload.data,
    payload.items,
    payload.result,
    payload.value,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const getNameFromNames = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const preferredKeys = ["2", "1", "en", "hy", "ru"];

  for (const key of preferredKeys) {
    const entry = value[key];

    if (typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
  }

  const first = Object.values(value).find(
    (entry) => typeof entry === "string" && entry.trim(),
  );

  return typeof first === "string" ? first.trim() : null;
};

export const toDictionaryCategoryOption = (
  item: unknown,
): DictionaryCategoryOption | null => {
  if (!isRecord(item)) {
    return null;
  }

  const idCandidate = item.id ?? item.categoryId ?? item.value;
  const numericId = Number(idCandidate);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const directNameCandidates = [item.name, item.label, item.title, item.text];
  const directName = directNameCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );

  const normalizedName =
    (typeof directName === "string" ? directName.trim() : null) ??
    getNameFromNames(item.names);

  if (!normalizedName) {
    return null;
  }

  return {
    id: numericId,
    name: normalizedName,
  };
};

export const toDictionaryRegionOption = (
  item: unknown,
): DictionaryRegionOption | null => {
  if (!isRecord(item)) {
    return null;
  }

  const idCandidate = item.id ?? item.regionId ?? item.value;
  const numericId = Number(idCandidate);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const directNameCandidates = [item.name, item.label, item.title, item.text];
  const directName = directNameCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );

  const normalizedName =
    (typeof directName === "string" ? directName.trim() : null) ??
    getNameFromNames(item.names);

  if (!normalizedName) {
    return null;
  }

  return {
    id: numericId,
    name: normalizedName,
  };
};
