import { db, Role } from "@/db";
import { users } from "@/db/tables";
import { paginateOffset, PaginationFactory, type FilterOperator } from ".";

// Example 1: Offset pagination with filters and sorting
async function getUsersWithOffset() {
  const result = await paginateOffset(db, users, {
    page: 1,
    limit: 20,
    filters: [
      { column: "is_active", operator: "eq" as FilterOperator, value: true },
      {
        column: "created_at",
        operator: "gte" as FilterOperator,
        value: new Date(),
      },
    ],
    search: {
      columns: ["name", "email"],
      term: "john doe",
      mode: "any",
    },
    sorts: [
      { column: "created_at", direction: "desc" },
      { column: "name", direction: "asc" },
    ],
    includeTotal: true,
  });

  console.log("Users:", result.data?.items);
  console.log("Total pages:", result.data?.pagination_meta.totalPages);
  console.log("Has next page:", result.data?.pagination_meta.hasMore);
}

// Example 2: Cursor pagination
// async function getPostsWithCursor() {
//   const result = await paginateCursor(db, posts, {
//     cursor: null, // First page
//     limit: 10,
//     cursorColumn: "id",
//     filters: [
//       { column: "views", operator: "gt" as FilterOperator, value: 100 },
//     ],
//     sorts: [
//       { column: "publishedAt", direction: "desc", nulls: "last" },
//       { column: "id", direction: "asc" },
//     ],
//     includeTotal: false,
//   });

//   console.log("Posts:", result.items);
//   console.log("Next cursor:", result.meta.nextCursor);
//   console.log("Has previous page:", result.meta.hasPreviousPage);
// }

// Example 3: Using factory pattern for complex scenarios
async function complexUserQuery() {
  const userPagination = PaginationFactory.createOffsetPagination(db, users);

  const result = await userPagination.paginate({
    page: 2,
    limit: 15,
    filters: [
      { column: "is_active", operator: "eq" as FilterOperator, value: true },
      {
        column: "created_at",
        operator: "between" as FilterOperator,
        value: [18, 65],
      },
    ],
    search: {
      columns: ["email"],
      term: "company.com",
      mode: "phrase",
    },
    sorts: [{ column: "created_at", direction: "desc" }],
  });

  return result;
}

// Example 4: Type-safe pagination with custom selects
async function getUsersWithCustomSelect() {
  const result = await paginateOffset<
    typeof users,
    { id: number; email: string; name: string }
  >(db, users, {
    page: 1,
    limit: 10,
  });

  // Result items are typed as { id: number; email: string; name: string }
  return result;
}

// // Example 5: Backward cursor pagination
// async function getPostsBackward() {
//   const result = await paginateCursor(db, posts, {
//     cursor: "MjAyNC0wMS0wMVQwMDowMDowMC4wMDBa", // Base64 encoded cursor
//     limit: 10,
//     cursorColumn: "publishedAt",
//     cursorDirection: "backward",
//     sorts: [{ column: "publishedAt", direction: "desc" }],
//   });

//   return result;
// }

// Example 6: Advanced filters
async function advancedFilterExample() {
  const result = await paginateOffset(db, users, {
    page: 1,
    limit: 20,
    filters: [
      {
        column: "email",
        operator: "ilike" as FilterOperator,
        value: "%@gmail.com",
      },
      {
        column: "role",
        operator: "in" as FilterOperator,
        value: [Role.ADMIN, Role.GUEST],
      },
      {
        column: "created_at",
        operator: "gt" as FilterOperator,
        value: new Date("2023-01-01"),
      },
      {
        column: "updated_at",
        operator: "isNull" as FilterOperator,
        value: true,
      },
    ],
  });

  return result;
}
