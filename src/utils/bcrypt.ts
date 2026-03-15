import bcrypt from "bcryptjs";

export const hashValue = async (
  value?: string | null,
  saltRounds: number = 10
) => {
  if (!value) return null;
  return await bcrypt.hash(value, saltRounds);
};

export const compareValue = async (value: string, hashedValue: string) =>
  await bcrypt.compare(value, hashedValue);
