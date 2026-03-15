// type IPartialIfExist<T> = T extends never ? never : Partial<T>;
// type IPartialIfExistElseUnknown<T> = T extends never ? unknown : Partial<T>;
// type IBIfNotA<A, B> = A extends never ? B : A;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
export type ApiResponse<T> = {
  data: T;
  cursor?: { [key: string]: string } | string | number;
  [key: string]: unknown;
};

export type UnionIfBPresent<A, B> = [B] extends [never | any] ? A : A & B;
type ExtractHookParams<T> = T extends (...args: infer P) => any ? P : never;

// Extract the first parameter type from a hook function
type ExtractHookOptions<T> = T extends (...args: any) => any
  ? ExtractHookParams<T>[0]
  : never;
