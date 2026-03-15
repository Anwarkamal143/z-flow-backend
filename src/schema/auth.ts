import { accounts, users } from "@/db/tables";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
export const RegisterUserSchema = createInsertSchema(users, {
  email: z
    .email({ message: "Provide a valid email." })
    .min(1, "Email is required."),
  name: (schema) => schema.min(1, "First Name is required."),
  password: (schema) => schema.min(8, "Password must be 8 charactors long"),
});
export const LoginSchema = createInsertSchema(users, {
  email: z
    .email({ message: "Provide a valid email." })
    .min(1, "Email is required."),
  password: (schema) => schema.min(8, "Password must be 8 charactors long"),
});
export type IUser = typeof users.$inferSelect;
// export type IRegisterUser = z.infer<typeof RegisterUserSchema>;
// export type ILogInUser = z.infer<typeof LoginSchema>;
export type IAccount = typeof accounts.$inferSelect;
export type IRegisterUser = z.infer<typeof RegisterUserSchema>;
export type ILogInUser = z.infer<typeof LoginSchema>;
