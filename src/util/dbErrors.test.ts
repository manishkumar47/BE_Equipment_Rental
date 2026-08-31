import { describe, it, expect } from "vitest";
import { isUniqueConstraintViolation } from "./dbErrors.js";

describe("isUniqueConstraintViolation", () => {
  it("returns true for a raw node-postgres error with a top-level code", () => {
    expect(isUniqueConstraintViolation({ code: "23505" })).toBe(true);
  });

  it("returns true for a DrizzleQueryError-shaped error with the code nested under .cause", () => {
    expect(isUniqueConstraintViolation({ name: "DrizzleQueryError", cause: { code: "23505" } })).toBe(
      true,
    );
  });

  it("returns false for a different Postgres error code", () => {
    expect(isUniqueConstraintViolation({ code: "23503" })).toBe(false);
    expect(isUniqueConstraintViolation({ cause: { code: "23503" } })).toBe(false);
  });

  it("returns false for non-error-shaped values", () => {
    expect(isUniqueConstraintViolation(null)).toBe(false);
    expect(isUniqueConstraintViolation(undefined)).toBe(false);
    expect(isUniqueConstraintViolation("boom")).toBe(false);
    expect(isUniqueConstraintViolation(new Error("plain error"))).toBe(false);
  });
});
