import { describe, it, expect } from "vitest";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signupInitiateSchema,
  signupResendSchema,
  signupVerifySchema,
} from "./auth.schema.js";

describe("auth.schema", () => {
  describe("loginSchema", () => {
    it("accepts a valid email and non-empty password", () => {
      const result = loginSchema.safeParse({ email: "a@b.com", password: "x" });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
      const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
      expect(result.success).toBe(false);
    });

    it("rejects an empty password", () => {
      const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("rejects a malformed email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    });

    it("accepts a valid email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    });
  });

  describe("resetPasswordSchema", () => {
    it("rejects passwords shorter than 8 characters", () => {
      const result = resetPasswordSchema.safeParse({ password: "short", token: "t" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing token", () => {
      const result = resetPasswordSchema.safeParse({ password: "longenough", token: "" });
      expect(result.success).toBe(false);
    });

    it("accepts a valid password and token", () => {
      const result = resetPasswordSchema.safeParse({
        password: "longenough",
        token: "sometoken",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("signupInitiateSchema", () => {
    it("rejects a name shorter than 2 characters", () => {
      const result = signupInitiateSchema.safeParse({
        name: "A",
        email: "a@b.com",
        password: "longenough",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password shorter than 8 characters", () => {
      const result = signupInitiateSchema.safeParse({
        name: "Alice",
        email: "a@b.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid signup data", () => {
      const result = signupInitiateSchema.safeParse({
        name: "Alice",
        email: "a@b.com",
        password: "longenough",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("signupResendSchema", () => {
    it("rejects an invalid email", () => {
      expect(signupResendSchema.safeParse({ email: "bad" }).success).toBe(false);
    });
  });

  describe("signupVerifySchema", () => {
    it("rejects an OTP that is not exactly 4 digits", () => {
      expect(
        signupVerifySchema.safeParse({ email: "a@b.com", otp: "123" }).success,
      ).toBe(false);
      expect(
        signupVerifySchema.safeParse({ email: "a@b.com", otp: "12345" }).success,
      ).toBe(false);
    });

    it("rejects a non-numeric OTP", () => {
      expect(
        signupVerifySchema.safeParse({ email: "a@b.com", otp: "abcd" }).success,
      ).toBe(false);
    });

    it("accepts a valid 4-digit OTP", () => {
      expect(
        signupVerifySchema.safeParse({ email: "a@b.com", otp: "1234" }).success,
      ).toBe(true);
    });
  });
});
