/**
 * Shared helpers for BaseService and pagination/validation logic.
 * Keeps base.service.ts focused and makes validation reusable across services.
 */
import { stringToNumber } from "@/utils";
import type { FilterCondition, SortConfig } from "./pagination/types";

/** Parse limit from string/number; return positive number or null. */
export function parseLimit(
  limit: number | string | null | undefined,
): number | null {
  const n = limit != null ? stringToNumber(limit) : null;
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

/** Validate limit for pagination; returns error message if invalid. */
export function validateLimit(
  limit: number | string | null | undefined,
): string | null {
  const n = limit != null ? stringToNumber(limit) : undefined;
  if (n == null) return null;
  if (!Number.isFinite(n) || n <= 0) return "Limit must be greater than zero";
  return null;
}

/** Coerce includeTotal from query (string "true"/"false" or boolean). */
export function coerceIncludeTotal(
  value: boolean | string | undefined,
): boolean {
  if (value === undefined) return false;
  return typeof value === "string" ? value === "true" : Boolean(value);
}

/** Parse value: return as-is if object, JSON.parse if string, undefined if null/empty. */
export function parseIfExistAndString(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === "object") return value;
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/** Filter array of items by allowed column keys. */
export function filterByTableColumns<T extends object, K extends keyof T>(
  items: T[],
  tableColumns: string[],
  getColumn: (item: T) => K | string,
): T[] {
  if (!items?.length) return items;
  return items.filter((item) => tableColumns.includes(String(getColumn(item))));
}

/** Validate and filter filter conditions by table columns. */
export function filterConditionsByTable<T extends Record<string, unknown>>(
  filters: FilterCondition<T>[] | string | undefined,
  tableColumns: string[],
  parse: (v: unknown) => unknown,
): FilterCondition<T>[] | undefined {
  const parsed = parse(filters) as FilterCondition<T>[] | undefined;
  if (parsed == null || typeof parsed === "string" || !parsed.length)
    return undefined;
  return parsed.filter((f) => tableColumns.includes(String(f.column)));
}

/** Validate and filter sort configs by table columns. */
export function filterSortsByTable<T extends Record<string, unknown>>(
  sorts: SortConfig<T>[] | string | undefined,
  tableColumns: string[],
  parse: (v: unknown) => unknown,
): SortConfig<T>[] | undefined {
  const parsed = parse(sorts) as SortConfig<T>[] | undefined;
  if (parsed == null || typeof parsed === "string" || !parsed.length)
    return undefined;
  return parsed.filter((s) => tableColumns.includes(String(s.column)));
}
