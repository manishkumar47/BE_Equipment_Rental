import { describe, it, expect, vi } from "vitest";

vi.mock("../../../database/repository/user.repository.js");

import * as userRepository from "../../../database/repository/user.repository.js";
import * as userService from "../../../service/user.service.js";

describe("user.service", () => {
  describe("createUser", () => {
    it("throws 409 when a user already exists with the email", async () => {
      vi.mocked(userRepository.findUserByEmail).mockResolvedValue({ id: 1 } as any);

      await expect(
        userService.createUser({
          name: "Alice",
          email: "a@b.com",
          password: "plaintext",
          role: "USER",
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(userRepository.createUserByDrizzle).not.toHaveBeenCalled();
    });

    it("hashes the password and forces role to USER on creation", async () => {
      vi.mocked(userRepository.findUserByEmail).mockResolvedValue(undefined as any);
      vi.mocked(userRepository.createUserByDrizzle).mockResolvedValue([
        { id: 1, name: "Alice", email: "a@b.com", role: "USER" },
      ] as any);

      await userService.createUser({
        name: "Alice",
        email: "a@b.com",
        password: "plaintext",
        role: "ADMIN" as any,
      });

      const [createdArg] = vi.mocked(userRepository.createUserByDrizzle).mock.calls[0]!;
      expect(createdArg.role).toBe("USER");
      expect(createdArg.password).not.toBe("plaintext");
    });
  });

  describe("getAllUsers", () => {
    it("returns whatever the repository returns", async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      vi.mocked(userRepository.getAllUsers).mockResolvedValue(rows as any);

      await expect(userService.getAllUsers()).resolves.toEqual(rows);
    });
  });

  describe("getUserById", () => {
    it("throws 404 when the user does not exist", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue(undefined as any);
      await expect(userService.getUserById(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when the user is soft-deleted", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue({ isDeleted: true } as any);
      await expect(userService.getUserById(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns a safe projection without the password field", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 1,
        name: "Alice",
        email: "a@b.com",
        password: "should-not-leak",
        role: "USER",
        createdAt: new Date("2026-01-01"),
        isDeleted: false,
      } as any);

      const result = await userService.getUserById(1);

      expect(result).toEqual({
        id: 1,
        name: "Alice",
        email: "a@b.com",
        role: "USER",
        createdAt: new Date("2026-01-01"),
      });
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("updateUserRole", () => {
    it("throws 404 when the user does not exist", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue(undefined as any);
      await expect(userService.updateUserRole(1, "ADMIN")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when the user is soft-deleted", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue({ isDeleted: true } as any);
      await expect(userService.updateUserRole(1, "ADMIN")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("delegates the role update to the repository", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue({ isDeleted: false } as any);
      vi.mocked(userRepository.updateUserRole).mockResolvedValue({ id: 1, role: "ADMIN" } as any);

      await expect(userService.updateUserRole(1, "ADMIN")).resolves.toEqual({
        id: 1,
        role: "ADMIN",
      });
      expect(userRepository.updateUserRole).toHaveBeenCalledWith(1, "ADMIN");
    });
  });

  describe("deleteUser", () => {
    it("throws 404 when the user does not exist", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue(undefined as any);
      await expect(userService.deleteUser(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when the user is already soft-deleted", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue({ isDeleted: true } as any);
      await expect(userService.deleteUser(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("delegates the soft-delete to the repository", async () => {
      vi.mocked(userRepository.findUserById).mockResolvedValue({ isDeleted: false } as any);
      vi.mocked(userRepository.softDeleteUser).mockResolvedValue({ id: 1, isDeleted: true } as any);

      await userService.deleteUser(1);
      expect(userRepository.softDeleteUser).toHaveBeenCalledWith(1);
    });
  });
});
