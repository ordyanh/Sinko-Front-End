import { z } from "zod";

/**
 * Valid Armenian phone prefixes following +374 (or 374):
 *
 * Mobile Operators:
 * - Team Telecom Armenia (Beeline): 33, 43, 91, 96, 99
 * - Ucom: 41, 44, 55, 95
 * - Viva (MTS Armenia): 77, 88, 93, 94, 98
 * - Other mobile / MVNO: 49, 50
 *
 * Fixed-line / Landline (стационарные):
 * - Yerevan: 10, 11, 12, 15
 * - Regional (Marzes): 22 (Kotayk), 23 (Ararat, Armavir, Aragatsotn), 24 (Shirak, Aragatsotn),
 *   25 (Lori), 26 (Gegharkunik, Tavush), 27 (Aragatsotn), 28 (Syunik, Vayots Dzor)
 * - VoIP / Alternative fixed network: 60
 * - Artsakh: 47
 */
export const ARMENIAN_PHONE_PREFIXES = [
  "10", "11", "12", "15",
  "22", "23", "24", "25", "26", "27", "28",
  "33",
  "41", "43", "44", "47", "49",
  "50", "55",
  "60",
  "77",
  "88",
  "91", "93", "94", "95", "96", "98", "99",
] as const;

/**
 * Strips whitespace, dashes, parentheses, dots.
 */
export function cleanPhoneNumber(value: string): string {
  return value.trim().replace(/[\s\-\(\)\.]/g, "");
}

/**
 * Armenian phone regex:
 * Must start with +374 or 374,
 * followed by a valid 2-digit internal code,
 * followed by exactly 6 digits (total 8 digits after 374).
 */
export const ARMENIAN_PHONE_REGEX =
  /^(?:\+?374|0)(10|11|12|15|22|23|24|25|26|27|28|33|41|43|44|47|49|50|55|60|77|88|91|93|94|95|96|98|99)\d{6}$/;

/**
 * Checks if a string is a valid Armenian phone number (mobile or landline).
 */
export function isValidArmenianPhone(val: string | null | undefined): boolean {
  if (!val) return false;
  const cleaned = cleanPhoneNumber(val);
  return ARMENIAN_PHONE_REGEX.test(cleaned);
}

/**
 * Normalizes an Armenian phone number to standard E.164 (+374XXXXXXXX).
 */
export function normalizeArmenianPhone(val: string): string {
  const cleaned = cleanPhoneNumber(val);
  if (cleaned.startsWith("+374")) return cleaned;
  if (cleaned.startsWith("374")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+374${cleaned.slice(1)}`;
  return cleaned.startsWith("+") ? cleaned : (cleaned ? `+${cleaned}` : val.trim());
}

export const ARMENIAN_PHONE_ERROR_MESSAGE =
  "Must be a valid Armenian phone number (+374 XX XXXXXX).";

export const armenianPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .refine(isValidArmenianPhone, {
    message: ARMENIAN_PHONE_ERROR_MESSAGE,
  });

export const armenianPhoneOptionalSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((val) => !val || isValidArmenianPhone(val), {
    message: ARMENIAN_PHONE_ERROR_MESSAGE,
  });
