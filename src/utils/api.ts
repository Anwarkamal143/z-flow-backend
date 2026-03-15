import { IPaginationMeta } from "@/services/pagination/types";

export function calculateTotalPages(
  total: number | null = 0,
  limit?: number,
): number | undefined {
  if (total && total > 0) {
    return limit != null && limit > 0 ? Math.ceil(total / limit) : 1;
  }
  return undefined;
}
export function buildSimplePaginationMetaCursor({
  items,
  limit,
  total,
  cursor,
  hasMore,
  columnName,
}: {
  items: any[];
  limit?: number;
  total?: number;
  cursor: number | string;
  hasMore: boolean;
  columnName: string;
}): IPaginationMeta {
  return {
    hasMore,
    totalRecords: total,
    isLast: !hasMore,
    next:
      columnName && items?.length > 0 && hasMore
        ? (items[items.length - 1][`${columnName}`] as string)
        : undefined,
    limit,
    totalPages: calculateTotalPages(total, limit),
    isFirst: cursor == null,
    current: cursor,
  };
}
export function buildPaginationMetaCursor({
  limit,
  total,
  cursor,
  hasMore,
  next,
  previous,
}: {
  limit?: number;
  total?: number;
  cursor: number | string;
  hasMore: boolean;
  next?: string;
  previous?: string | null;
}): IPaginationMeta {
  return {
    hasMore,
    totalRecords: total,
    isLast: !hasMore,
    next: next,
    limit,
    totalPages: calculateTotalPages(total, limit),
    isFirst: cursor == null,
    current: cursor,
    previous,
  };
}
export function buildPaginationMetaForOffset({
  limit,
  total,
  page,
  hasMore,
}: {
  limit?: number;
  total?: number | null;
  page?: number;
  hasMore: boolean;
}): IPaginationMeta {
  // Page starts from 1
  return {
    hasMore,
    totalRecords: total as number | undefined,
    isLast: !hasMore,

    limit,
    totalPages: calculateTotalPages(total, limit),
    isFirst: page === 1,
    current: page,
    next: hasMore && page != null ? page + 1 : undefined,
    previous: page != null && page > 1 ? page - 1 : undefined,
  };
}
