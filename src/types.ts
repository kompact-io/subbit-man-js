export type Left<E> = { kind: "Left"; error: E };
export type Right<T> = { kind: "Right"; value: T };
export type Either<T, E> = Left<E> | Right<T>;

export type Currency =
  | { kind: "Ada" }
  | { kind: "ByHash"; value: Buffer }
  | { kind: "ByClass"; value: Buffer };
