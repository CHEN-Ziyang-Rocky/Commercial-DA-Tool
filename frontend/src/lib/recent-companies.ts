import type { CompanyOption } from "./registry-types";

export const RECENT_COMPANY_LIMIT = 8;
export function readRecentCompanies(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((v): v is string => typeof v === "string" && /^[A-Z0-9]{20}$/.test(v)))].slice(0, RECENT_COMPANY_LIMIT)
      : [];
  } catch { return []; }
}
export function rememberCompanies(current: string[], chosen: string[]) {
  return readRecentCompanies(JSON.stringify([...chosen, ...current]));
}
export function orderCompanies(options: CompanyOption[], recent: string[]) {
  const positions = new Map(recent.map((lei, index) => [lei, index]));
  return [...options].sort((a, b) =>
    (positions.get(a.lei) ?? Infinity) - (positions.get(b.lei) ?? Infinity) ||
    a.label.localeCompare(b.label, "en"));
}
