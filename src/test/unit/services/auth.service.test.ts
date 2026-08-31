import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/repository/auth.repository.js");
vi.mock("../../../util/emails/resetPasswordEmail.js");
vi.mock("../../../util/emails/otpEmail.js");

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../../../config/env.js";
import * as authRepository from "../../../database/repository/auth.repository.js";
import { sendResetPassword } from "../../../util/emails/resetPasswordEmail.js";
import { sendSignupOtpEmail } from "../../../util/emails/otpEmail.js";
import * as authService from "../../../service/auth.service.js";

beforeEach(() => {
  vi.mocked(sendResetPassword).mockResolvedValue(true);
  vi.mocked(sendSignupOtpEmail).mockResolvedValue(true);
});

describe("auth.service", () => {
  describe("loginUser", () => {
    it("throws 404 when the user does not exist", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      await expect(
        authService.loginUser("nobody@example.com", "pw"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when the user is soft-deleted", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 1,
        isDeleted: true,
        password: "hash",
      } as any);
      await expect(authService.loginUser("a@b.com", "pw")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 401 for an incorrect password", async () => {
      const hashed = await bcrypt.hash("correct-pw", 10);
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 1,
        isDeleted: false,
        password: hashed,
      } as any);
      await expect(authService.loginUser("a@b.com", "wrong-pw")).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("normalizes the email and returns the user record on correct credentials", async () => {
      const hashed = await bcrypt.hash("correct-pw", 10);
      const userRow = { id: 1, isDeleted: false, password: hashed, email: "a@b.com", role: "USER" };
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(userRow as any);

      const result = await authService.loginUser(" A@B.com ", "correct-pw");

      expect(result).toEqual(userRow);
      expect(authRepository.findUserByEmailSafe).toHaveBeenCalledWith("a@b.com");
    });
  });

  describe("createUserToken", () => {
    it("creates a JWT decodable with the app secret", async () => {
      const token = await authService.createUserToken({
        userTokenPayload: { id: 1, email: "a@b.com", role: "USER" },
      });

      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      expect(decoded.id).toBe(1);
      expect(decoded.role).toBe("USER");
    });
  });

  describe("findUserByEmail", () => {
    it("throws 404 when not found", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      await expect(authService.findUserByEmail("x@y.com")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when soft-deleted", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        isDeleted: true,
      } as any);
      await expect(authService.findUserByEmail("x@y.com")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns the user when found", async () => {
      const row = { id: 2, isDeleted: false, email: "x@y.com" };
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(row as any);
      await expect(authService.findUserByEmail("x@y.com")).resolves.toEqual(row);
    });
  });

  describe("requestPasswordReset", () => {
    it("throws 404 for a non-existent account", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      await expect(
        authService.requestPasswordReset("nobody@example.com"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("invalidates old tokens, creates a new one, and sends the email on success", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 5,
        isDeleted: false,
        email: "a@b.com",
        name: "Alice",
      } as any);
      vi.mocked(authRepository.invalidateUserResetTokens).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createPasswordResetRecord).mockResolvedValue({ id: 99 } as any);

      await authService.requestPasswordReset("a@b.com");

      expect(authRepository.invalidateUserResetTokens).toHaveBeenCalledWith(5);
      expect(authRepository.createPasswordResetRecord).toHaveBeenCalledWith(5, expect.any(Date));
      expect(sendResetPassword).toHaveBeenCalledWith({
        user: { name: "Alice", email: "a@b.com" },
        token: expect.any(String),
      });
    });

    it("throws 500 when the reset record could not be created", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 5,
        isDeleted: false,
        email: "a@b.com",
        name: "Alice",
      } as any);
      vi.mocked(authRepository.invalidateUserResetTokens).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createPasswordResetRecord).mockResolvedValue(undefined as any);

      await expect(authService.requestPasswordReset("a@b.com")).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("throws 500 when the email fails to send", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 5,
        isDeleted: false,
        email: "a@b.com",
        name: "Alice",
      } as any);
      vi.mocked(authRepository.invalidateUserResetTokens).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createPasswordResetRecord).mockResolvedValue({ id: 99 } as any);
      vi.mocked(sendResetPassword).mockResolvedValue(false);

      await expect(authService.requestPasswordReset("a@b.com")).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe("resetPassword", () => {
    it("rejects passwords shorter than 8 characters", async () => {
      await expect(
        authService.resetPassword("some.jwt.token", "short"),
      ).rejects.toThrow("New password must be at least 8 characters long!");
    });

    it("rejects an empty token", async () => {
      await expect(
        authService.resetPassword("", "validPassword123"),
      ).rejects.toThrow("Reset token is required");
    });

    it("rejects a malformed JWT", async () => {
      await expect(
        authService.resetPassword("invalid-token-string", "validPassword123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("rejects an expired JWT", async () => {
      const expiredToken = jwt.sign({ id: 1, email: "user@example.com" }, env.JWT_SECRET, {
        expiresIn: "-1s",
      });
      await expect(
        authService.resetPassword(expiredToken, "validPassword123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("rejects a token signed with a different secret", async () => {
      const forged = jwt.sign({ id: 1, email: "user@example.com" }, "some-other-secret", {
        expiresIn: "15m",
      });
      await expect(
        authService.resetPassword(forged, "validPassword123"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("rejects when the user in the token no longer exists", async () => {
      const token = jwt.sign({ id: 1, email: "user@example.com" }, env.JWT_SECRET, {
        expiresIn: "15m",
      });
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);

      await expect(
        authService.resetPassword(token, "validPassword123"),
      ).rejects.toThrow("Invalid reset token or user no longer exists");
    });

    it("resets the password when the token and user are valid", async () => {
      const token = jwt.sign({ id: 1, email: "user@example.com" }, env.JWT_SECRET, {
        expiresIn: "15m",
      });
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 1,
        email: "user@example.com",
      } as any);
      vi.mocked(authRepository.executeResetPasswordTransaction).mockResolvedValue({ id: 1 } as any);

      await expect(
        authService.resetPassword(token, "validPassword123"),
      ).resolves.toBeUndefined();
      expect(authRepository.executeResetPasswordTransaction).toHaveBeenCalledWith(
        1,
        1,
        expect.any(String),
      );
    });

    it("wraps a transaction failure into a 400 AppError", async () => {
      const token = jwt.sign({ id: 1, email: "user@example.com" }, env.JWT_SECRET, {
        expiresIn: "15m",
      });
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({
        id: 1,
        email: "user@example.com",
      } as any);
      vi.mocked(authRepository.executeResetPasswordTransaction).mockRejectedValue(
        new Error("This reset link has already been used"),
      );

      await expect(
        authService.resetPassword(token, "validPassword123"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "This reset link has already been used",
      });
    });
  });

  describe("initiateSignup", () => {
    const input = { name: "Alice", email: "Alice@Example.com", password: "longenough" };

    it("throws 409 when a user already exists with the email", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue({ id: 1 } as any);
      await expect(authService.initiateSignup(input)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("enforces a cooldown since the last OTP request", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        createdAt: new Date(),
      } as any);

      await expect(authService.initiateSignup(input)).rejects.toMatchObject({
        statusCode: 429,
      });
    });

    it("creates an OTP record and sends the email when there is no cooldown", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.invalidateUnusedOtpForEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createOtpVerificationRecord).mockResolvedValue({ id: 1 } as any);

      const result = await authService.initiateSignup(input);

      expect(result).toEqual({ message: "Verification code sent to your email." });
      expect(authRepository.createOtpVerificationRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "alice@example.com",
          payload: expect.objectContaining({ name: "Alice" }),
        }),
      );
      expect(sendSignupOtpEmail).toHaveBeenCalled();
    });

    it("throws 500 when the OTP record could not be created", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.invalidateUnusedOtpForEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createOtpVerificationRecord).mockResolvedValue(undefined as any);

      await expect(authService.initiateSignup(input)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("does not throw even if the OTP email fails to send", async () => {
      vi.mocked(authRepository.findUserByEmailSafe).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.invalidateUnusedOtpForEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createOtpVerificationRecord).mockResolvedValue({ id: 1 } as any);
      vi.mocked(sendSignupOtpEmail).mockResolvedValue(false);

      await expect(authService.initiateSignup(input)).resolves.toEqual({
        message: "Verification code sent to your email.",
      });
    });
  });

  describe("resendSignupOtp", () => {
    it("throws 400 when there is no pending signup", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue(undefined as any);
      await expect(authService.resendSignupOtp("a@b.com")).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("enforces the cooldown before allowing a resend", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        createdAt: new Date(),
        payload: { name: "Alice", hashedPassword: "hash" },
      } as any);

      await expect(authService.resendSignupOtp("a@b.com")).rejects.toMatchObject({
        statusCode: 429,
      });
    });

    it("throws 400 when the pending payload is corrupted", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        payload: {},
      } as any);

      await expect(authService.resendSignupOtp("a@b.com")).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("issues a new OTP reusing the stored payload", async () => {
      const oldOtp = {
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        payload: { name: "Alice", hashedPassword: "hash" },
      };
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue(oldOtp as any);
      vi.mocked(authRepository.invalidateUnusedOtpForEmail).mockResolvedValue(undefined as any);
      vi.mocked(authRepository.createOtpVerificationRecord).mockResolvedValue({ id: 2 } as any);

      const result = await authService.resendSignupOtp("a@b.com");

      expect(result).toEqual({ message: "A new verification code has been sent." });
      expect(authRepository.createOtpVerificationRecord).toHaveBeenCalledWith(
        expect.objectContaining({ payload: oldOtp.payload }),
      );
    });
  });

  describe("verifySignupOtp", () => {
    it("throws 400 when there is no unused OTP session", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue(undefined as any);
      await expect(
        authService.verifySignupOtp({ email: "a@b.com", otp: "1234" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when the OTP has expired", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        used: false,
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
        otpHash: await bcrypt.hash("1234", 10),
      } as any);

      await expect(
        authService.verifySignupOtp({ email: "a@b.com", otp: "1234" }),
      ).rejects.toThrow("Verification code has expired");
    });

    it("throws 400 after too many failed attempts", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 5,
        otpHash: await bcrypt.hash("1234", 10),
      } as any);

      await expect(
        authService.verifySignupOtp({ email: "a@b.com", otp: "1234" }),
      ).rejects.toThrow("Too many failed attempts");
    });

    it("increments attempts and throws 400 for a wrong OTP", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        id: 7,
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 1,
        otpHash: await bcrypt.hash("1234", 10),
      } as any);
      vi.mocked(authRepository.incrementOtpAttempts).mockResolvedValue(undefined as any);

      await expect(
        authService.verifySignupOtp({ email: "a@b.com", otp: "9999" }),
      ).rejects.toThrow("Invalid verification code.");
      expect(authRepository.incrementOtpAttempts).toHaveBeenCalledWith(7);
    });

    it("throws 400 when the stored payload is invalid", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        id: 7,
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        otpHash: await bcrypt.hash("1234", 10),
        payload: {},
      } as any);

      await expect(
        authService.verifySignupOtp({ email: "a@b.com", otp: "1234" }),
      ).rejects.toThrow("Pending registration data is invalid");
    });

    it("creates the user and returns a session on a correct OTP", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        id: 7,
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        otpHash: await bcrypt.hash("1234", 10),
        payload: { name: "Alice", hashedPassword: "hash" },
      } as any);
      vi.mocked(authRepository.executeVerifyAndCreateUserTransaction).mockResolvedValue({
        id: 10,
        name: "Alice",
        email: "a@b.com",
        role: "USER",
      } as any);

      const result = await authService.verifySignupOtp({ email: "a@b.com", otp: "1234" });

      expect(result).toMatchObject({ id: 10, name: "Alice", email: "a@b.com", role: "USER" });
      expect(result.token).toBeTypeOf("string");
    });

    it("maps a unique-constraint failure to a 409 AppError", async () => {
      vi.mocked(authRepository.findLatestUnusedOtpByEmail).mockResolvedValue({
        id: 7,
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        otpHash: await bcrypt.hash("1234", 10),
        payload: { name: "Alice", hashedPassword: "hash" },
      } as any);
      // Matches the real shape thrown by drizzle-orm (DrizzleQueryError nests
      // the original pg error under `.cause`, not at the top level).
      vi.mocked(authRepository.executeVerifyAndCreateUserTransaction).mockRejectedValue({
        name: "DrizzleQueryError",
        cause: { code: "23505" },
      });

      await expect(
        authService.verifySignupOtp({ email: "a@b.com", otp: "1234" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });
});
