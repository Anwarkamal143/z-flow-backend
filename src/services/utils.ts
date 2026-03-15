import { sql, SQL } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

export function jsonbAgg<T>(expression: SQL): SQL<T> {
  // return sql`jsonb_agg(${expression})`;
  // return sql`COALESCE(jsonb_agg(${expression}) FILTER (WHERE ${expression} IS NOT NULL), '[]'::jsonb)`;
  return sql`coalesce(jsonb_agg(${expression}), '[]'::jsonb)`;
  // return sql`COALESCE(jsonb_agg(${expression}) FILTER (WHERE ${expression} IS NOT NULL), '[]'::jsonb)`;
  // return sql`
  //     CASE
  //       WHEN ${expression} IS NULL THEN '[]'::jsonb
  //       ELSE ${sql`jsonb_agg(${expression})`}
  //     END
  //   `;
}

/**
 * @param shape Potential for SQL injections, so you shouldn't allow user-specified key names
 */
export function jsonbBuildObject<T extends Record<string, PgColumn | SQL>>(
  shape: T,
  keyToCheck?: keyof T
) {
  const chunks: SQL[] = [];
  let hasNonNullValue: any = false;
  Object.entries(shape).forEach(([key, value]) => {
    if (chunks.length > 0) {
      chunks.push(sql.raw(","));
    }
    chunks.push(sql.raw(`'${key}',`));
    chunks.push(sql`${value}`);
    if (keyToCheck && key === keyToCheck) {
      hasNonNullValue = value;
    }
  });
  if (hasNonNullValue) {
    return sql`
      CASE
        WHEN ${hasNonNullValue} IS NULL THEN NULL
        ELSE jsonb_build_object(${sql.join(chunks)})
      END
    `;
  }
  return sql`jsonb_build_object(${sql.join(chunks)})`;
}

// export function jsonBuildArrayHelper<T = unknown>(
//   ...expressions: SQL[]
// ): SQL<T> {
//   return sql`
//       CASE
//         WHEN ${expressions} IS NULL THEN ${sql`json_build_array(${undefined})`}
//         ELSE ${sql`json_build_array(${sql.join(expressions)})`}
//       END
//     `;
// }
export function jsonBuildArrayHelper<T = unknown>(
  ...expressions: SQL[]
): SQL<T> {
  return sql`
      CASE
        WHEN ${expressions} IS NULL  THEN '[]'::jsonb  -- ✅ Return empty array if no rows
        ELSE jsonb_agg(jsonb_build_array(${sql.join(
          expressions
        )}))  -- ✅ Use jsonb_agg()
      END
    `;
}
export function jsonAggDistinct<T = unknown>(...expressions: SQL[]): SQL<T> {
  return sql`
      CASE
        WHEN ${expressions} IS NULL THEN json_agg(${undefined})
        ELSE json_agg(${sql.join(expressions)})
      END
    `;
}

// Custom JSON array function that filters out null values
// This is the key modification to handle empty assets correctly
export const filteredJsonArrayHelper = <T = never>(obj: any): SQL<T> => {
  // const object = jsonbBuildObject(obj);
  return sql`
        COALESCE(
          (
            SELECT jsonb_agg(filtered_obj)
            FROM (
              SELECT ${obj}
              WHERE ${obj} IS NOT NULL
              AND (${obj}->>'id') IS NOT NULL
            ) AS filtered_obj
          ),
          '[]'::jsonb
        )
      `;
};
