import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { hashpassword } from "./bcrypt.helper.js";

describe("bcrypt.helper", () => {
  describe("hashpassword", () => {
    it("returns a bcrypt hash that is not the plaintext password", async () => {
      const hash = await hashpassword("SuperSecret123!");
      expect(hash).not.toBe("SuperSecret123!");
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it("produces a hash that verifies against the original password", async () => {
      const hash = await hashpassword("SuperSecret123!");
      await expect(bcrypt.compare("SuperSecret123!", hash)).resolves.toBe(true);
    });

    it("produces a hash that does not verify against a different password", async () => {
      const hash = await hashpassword("SuperSecret123!");
      await expect(bcrypt.compare("WrongPassword", hash)).resolves.toBe(false);
    });

    it("produces different hashes for the same password (random salt)", async () => {
      const [hashA, hashB] = await Promise.all([
        hashpassword("SamePassword1"),
        hashpassword("SamePassword1"),
      ]);
      expect(hashA).not.toBe(hashB);
    });
  });
});
