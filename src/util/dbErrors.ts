/**
 * True when `err` is a Postgres unique-constraint violation (SQLSTATE 23505),
 * whether thrown directly by node-postgres or wrapped in drizzle-orm's
 * `DrizzleQueryError` (which nests the original driver error under `.cause`
 * rather than exposing `.code` at the top level).
 */
export const isUniqueConstraintViolation = (err: unknown): boolean => {
  if (typeof err !== "object" || err === null) return false;

  if ("code" in err && (err as { code?: unknown }).code === "23505") return true;

  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return (cause as { code?: unknown }).code === "23505";
  }

  return false;
};
