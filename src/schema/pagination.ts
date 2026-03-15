import { z } from "zod";

const cursorPagination = z.object({
  mode: z.literal("cursor").optional(),
  cursor: z.string().nullable().optional(),
  limit: z.string().nullable().optional(),
  sort: z.enum(["asc", "desc"]).optional(),
  page: z.never().optional(), // forbidden
});

const offsetPagination = z.object({
  mode: z.literal("offset").optional(),
  page: z.string().nullable().optional(),
  limit: z.string().nullable().optional(),
  sort: z.enum(["asc", "desc"]).optional(),
  cursor: z.never().optional(), // forbidden
});

// FINAL SCHEMA
export const paginatedQuerySchema = z
  .union([cursorPagination, offsetPagination])
  .superRefine((data, ctx) => {
    // If mode is missing → do NOT validate anything
    if (!data.mode) return;

    const hasCursor = data.cursor != null;
    const hasPage = data.page != null;

    if (data.mode === "cursor" && hasPage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "page is not allowed when mode = cursor",
      });
    }

    if (data.mode === "offset" && hasCursor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cursor is not allowed when mode = offset",
      });
    }
  });

export type IPaginatedQuery = z.infer<typeof paginatedQuerySchema>;
