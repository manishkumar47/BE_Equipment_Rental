import { describe, it, expect } from "vitest";
import { userSchema, updateUserRoleSchema } from "./user.schema.js";

describe("user.schema", () => {
  describe("userSchema", () => {
    it("accepts valid user data", () => {
      const result = userSchema.safeParse({
        name: "Alice",
        email: "a@b.com",
        password: "longenough",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a name shorter than 2 characters", () => {
      expect(
        userSchema.safeParse({ name: "A", email: "a@b.com", password: "longenough" })
          .success,
      ).toBe(false);
    });

    it("rejects an invalid email", () => {
      expect(
        userSchema.safeParse({ name: "Alice", email: "bad", password: "longenough" })
          .success,
      ).toBe(false);
    });

    it("rejects a password shorter than 8 characters", () => {
      expect(
        userSchema.safeParse({ name: "Alice", email: "a@b.com", password: "short" })
          .success,
      ).toBe(false);
    });
  });

  describe("updateUserRoleSchema", () => {
    it("accepts ADMIN and USER", () => {
      expect(updateUserRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
      expect(updateUserRoleSchema.safeParse({ role: "USER" }).success).toBe(true);
    });

    it("rejects any other role value", () => {
      expect(updateUserRoleSchema.safeParse({ role: "SUPERADMIN" }).success).toBe(
        false,
      );
    });
  });
});
