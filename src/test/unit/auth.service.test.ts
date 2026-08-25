import { describe, it, expect } from "@jest/globals";
import * as authService from "../../service/auth.service.js";
import { AppError } from "../../util/appError.js";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

describe("Auth Service - Password Reset Edge Cases", () => {
  describe("resetPassword validation", () => {
    it("should reject passwords shorter than 8 characters", async () => {
      await expect(
        authService.resetPassword("some.jwt.token", "short"),
      ).rejects.toThrow("New password must be at least 8 characters long!");
    });

    it("should reject empty or missing password", async () => {
      await expect(
        authService.resetPassword("some.jwt.token", ""),
      ).rejects.toThrow("New password must be at least 8 characters long!");
    });

    it("should reject empty or missing token", async () => {
      await expect(
        authService.resetPassword("", "newValidPassword123"),
      ).rejects.toThrow("Reset token is required");
    });

    it("should reject malformed JWT tokens", async () => {
      await expect(
        authService.resetPassword("invalid-token-string", "validPassword123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("should reject expired JWT tokens", async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: "user@example.com" },
        env.JWT_SECRET,
        { expiresIn: "-1s" },
      );

      await expect(
        authService.resetPassword(expiredToken, "validPassword123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("should reject tokens signed with different secret", async () => {
      const forgedToken = jwt.sign(
        { id: 1, email: "user@example.com" },
        "some-other-secret",
        { expiresIn: "15m" },
      );

      await expect(
        authService.resetPassword(forgedToken, "validPassword123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });

  describe("verifySignupOtp guards", () => {
    it("should reject non-existent or empty OTP sessions", async () => {
      await expect(
        authService.verifySignupOtp({
          email: "nonexistent@example.com",
          otp: "1234",
        }),
      ).rejects.toThrow(
        "Invalid or expired verification session. Please sign up again.",
      );
    });
  });

  describe("loginUser error handling", () => {
    it("should reject non-existent user with 404 AppError", async () => {
      await expect(
        authService.loginUser("nonexistent@example.com", "password123"),
      ).rejects.toThrow("No user found with this email. Please sign up first.");
    });
  });

  describe("requestPasswordReset error handling", () => {
    it("should reject non-existent email with 404 AppError", async () => {
      await expect(
        authService.requestPasswordReset("nonexistent@example.com"),
      ).rejects.toThrow(
        "No account found with this email. Please check your email or sign up.",
      );
    });
  });
});


