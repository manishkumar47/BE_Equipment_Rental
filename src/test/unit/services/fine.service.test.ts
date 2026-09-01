import { describe, it, expect, vi } from "vitest";

vi.mock("../../../database/repository/fine.repository.js");

import * as fineRepository from "../../../database/repository/fine.repository.js";
import * as fineService from "../../../service/fine.service.js";

describe("fine.service", () => {
  describe("getMyFines", () => {
    it("delegates to the repository", async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      vi.mocked(fineRepository.getFinesByUserId).mockResolvedValue(rows as any);

      await expect(fineService.getMyFines(5)).resolves.toEqual(rows);
      expect(fineRepository.getFinesByUserId).toHaveBeenCalledWith(5);
    });
  });

  describe("payFine", () => {
    it("throws 404 when the fine does not exist", async () => {
      vi.mocked(fineRepository.getFineById).mockResolvedValue(undefined as any);
      await expect(fineService.payFine(1, 5)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 403 when the fine belongs to a different user", async () => {
      vi.mocked(fineRepository.getFineById).mockResolvedValue({
        id: 1,
        userId: 9,
        status: "unpaid",
      } as any);
      await expect(fineService.payFine(1, 5)).rejects.toMatchObject({ statusCode: 403 });
    });

    it("throws 409 when the fine is not 'unpaid'", async () => {
      vi.mocked(fineRepository.getFineById).mockResolvedValue({
        id: 1,
        userId: 5,
        status: "paid",
      } as any);
      await expect(fineService.payFine(1, 5)).rejects.toMatchObject({ statusCode: 409 });
    });

    it("throws 409 when the conditional pay update matches no row (race condition)", async () => {
      vi.mocked(fineRepository.getFineById).mockResolvedValue({
        id: 1,
        userId: 5,
        status: "unpaid",
      } as any);
      vi.mocked(fineRepository.markFinePaid).mockResolvedValue(undefined as any);

      await expect(fineService.payFine(1, 5)).rejects.toMatchObject({ statusCode: 409 });
    });

    it("marks the fine paid on success", async () => {
      vi.mocked(fineRepository.getFineById).mockResolvedValue({
        id: 1,
        userId: 5,
        status: "unpaid",
      } as any);
      const updated = { id: 1, userId: 5, status: "paid" };
      vi.mocked(fineRepository.markFinePaid).mockResolvedValue(updated as any);

      await expect(fineService.payFine(1, 5)).resolves.toEqual(updated);
      expect(fineRepository.markFinePaid).toHaveBeenCalledWith(1);
    });
  });
});
