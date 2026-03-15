import { isValid } from "ulid";
import z from "zod";

export const ULIDSchema = (message: string = "Invalid ID") =>
  z.string().refine((val) => isValid(val), {
    message: message,
  });
export const dateSchema = z.preprocess((val) => {
  if (typeof val == "string" || val instanceof Date) {
    const date = new Date(val);
    return isNaN(date.getTime()) ? val : date;
  }
  return val;
}, z.date());
