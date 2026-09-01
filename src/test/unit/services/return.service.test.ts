import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/repository/return.repository.js");
vi.mock("../../../database/repository/fine.repository.js");
vi.mock("../../../database/repository/rentalBookingItem.repository.js");
vi.mock("../../../database/repository/equipmentItem.repository.js");
vi.mock("../../../database/db-connection.js", () => ({
  default: { transaction: vi.fn((cb: any) => cb({})) },
}));

import * as returnRepository from "../../../database/repository/return.repository.js";
import * as fineRepository from "../../../database/repository/fine.repository.js";
import * as rentalBookingItemRepository from "../../../database/repository/rentalBookingItem.repository.js";
import * as equipmentItemRepository from "../../../database/repository/equipmentItem.repository.js";
import * as returnService from "../../../service/return.service.js";

beforeEach(() => {
  // Default: no physical units assigned to the booking (legacy/untracked path).
  vi.mocked(rentalBookingItemRepository.getAssignedItemIds).mockResolvedValue([]);
});

describe("return.service", () => {
  describe("requestReturn", () => {
    it("throws 404 when the booking does not exist", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(undefined as any);
      await expect(returnService.requestReturn(1, 1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 403 when the booking belongs to a different user", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 2,
        status: "active",
      } as any);
      await expect(returnService.requestReturn(1, 1)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("throws 409 when the booking is not active", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "returned",
      } as any);
      await expect(returnService.requestReturn(1, 1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("throws 409 when the conditional update matches no row (race condition)", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(returnRepository.requestReturn).mockResolvedValue(undefined as any);
      await expect(returnService.requestReturn(1, 1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("returns the updated booking on success", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      const updated = { id: 1, status: "return_requested" };
      vi.mocked(returnRepository.requestReturn).mockResolvedValue(updated as any);
      await expect(returnService.requestReturn(1, 1)).resolves.toEqual(updated);
    });
  });

  describe("getPendingReturnRequests", () => {
    it("paginates and flags overdue active bookings", async () => {
      const now = Date.now();
      vi.mocked(returnRepository.getPendingReturnRequests).mockResolvedValue({
        data: [
          { id: 1, status: "active", rentTo: new Date(now - 1000) },
          { id: 2, status: "active", rentTo: new Date(now + 100000) },
        ],
        total: 42,
      } as any);

      const result = await returnService.getPendingReturnRequests(2, 10, "drill");

      expect(returnRepository.getPendingReturnRequests).toHaveBeenCalledWith(2, 10, "drill");
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.data[0]!.computedStatus).toBe("overdue");
      expect(result.data[1]!.computedStatus).toBe("active");
    });
  });

  describe("confirmReturn", () => {
    const baseBooking = {
      id: 1,
      status: "return_requested",
      userId: 1,
      equipmentId: 9,
      quantity: 2,
      rentTo: new Date(),
      equipment: { price: 100 },
    };

    it("throws 404 when the booking does not exist", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(undefined as any);
      await expect(returnService.confirmReturn(1, "good")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 409 when the booking is not in 'return_requested' state", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        ...baseBooking,
        status: "active",
      } as any);
      await expect(returnService.confirmReturn(1, "good")).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("throws 400 when the damage fee exceeds 1.5x the equipment price", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(baseBooking as any);
      await expect(
        returnService.confirmReturn(1, "damaged", undefined, 200),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("restores stock and creates no fine for a not-late 'good' return", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);

      const result = await returnService.confirmReturn(1, "good");

      expect(fineRepository.createFine).not.toHaveBeenCalled();
      expect(returnRepository.restoreEquipmentStock).toHaveBeenCalledWith(9, 2, expect.anything());
      expect(result.fine).toBeNull();
    });

    it("creates a fine and restores stock for a 'damaged' return within the fee cap", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
      vi.mocked(fineRepository.createFine).mockResolvedValue({ id: 55 } as any);

      const result = await returnService.confirmReturn(1, "damaged", "scratched", 150);

      expect(fineRepository.createFine).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 150, reason: "damaged:150" }),
        expect.anything(),
      );
      expect(returnRepository.restoreEquipmentStock).toHaveBeenCalled();
      expect(result.fine).toMatchObject({ id: 55, totalFine: 150 });
    });

    it("charges replacement cost and does NOT restore stock for a 'lost' item", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(fineRepository.createFine).mockResolvedValue({ id: 56 } as any);

      const result = await returnService.confirmReturn(1, "lost");

      // quantity(2) * price(100) = 200
      expect(fineRepository.createFine).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 200, reason: "lost:200" }),
        expect.anything(),
      );
      expect(returnRepository.restoreEquipmentStock).not.toHaveBeenCalled();
      expect(result.fine).toMatchObject({ totalFine: 200 });
    });

    it("applies the tiered late fee on top of the condition fee", async () => {
      const lateBooking = {
        ...baseBooking,
        rentTo: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days late
      };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(lateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
      vi.mocked(fineRepository.createFine).mockResolvedValue({ id: 57 } as any);

      const result = await returnService.confirmReturn(1, "good");

      // 7 days @ ₹100 + 3 days @ ₹200 = 700 + 600 = 1300
      expect(result.fine).toMatchObject({ lateFee: 1300, totalFine: 1300 });
    });

    it("throws 409 when the conditional status update matches no row (race condition)", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(baseBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue(undefined as any);

      await expect(returnService.confirmReturn(1, "good")).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("syncs assigned physical units to 'available' on a 'good' return", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
      vi.mocked(rentalBookingItemRepository.getAssignedItemIds).mockResolvedValue([101, 102]);

      await returnService.confirmReturn(1, "good");

      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [101, 102],
        "available",
        expect.anything(),
      );
    });

    it("syncs assigned physical units to 'damaged' on a 'damaged' return", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
      vi.mocked(fineRepository.createFine).mockResolvedValue({ id: 1 } as any);
      vi.mocked(rentalBookingItemRepository.getAssignedItemIds).mockResolvedValue([101]);

      await returnService.confirmReturn(1, "damaged", undefined, 50);

      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [101],
        "damaged",
        expect.anything(),
      );
    });

    it("does not touch equipment items when none were assigned to the booking", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);

      await returnService.confirmReturn(1, "good");

      expect(equipmentItemRepository.updateEquipmentItemsStatus).not.toHaveBeenCalled();
    });
  });

  describe("rejectReturn", () => {
    it("throws 404 when the booking does not exist", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(undefined as any);
      await expect(returnService.rejectReturn(1, "reason")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 409 when the booking is not in 'return_requested' state", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({ status: "active" } as any);
      await expect(returnService.rejectReturn(1, "reason")).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("throws 409 when the conditional update matches no row (race condition)", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        status: "return_requested",
      } as any);
      vi.mocked(returnRepository.rejectReturn).mockResolvedValue(undefined as any);
      await expect(returnService.rejectReturn(1, "reason")).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("returns the updated booking on success", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        status: "return_requested",
      } as any);
      const updated = { id: 1, status: "active", rejectionReason: "reason" };
      vi.mocked(returnRepository.rejectReturn).mockResolvedValue(updated as any);
      await expect(returnService.rejectReturn(1, "reason")).resolves.toEqual(updated);
    });
  });
});
