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
  vi.mocked(rentalBookingItemRepository.getOutstandingItems).mockResolvedValue([]);
  vi.mocked(rentalBookingItemRepository.getPendingReturnItems).mockResolvedValue([]);
  vi.mocked(rentalBookingItemRepository.getPendingReturnItemsForBookings).mockResolvedValue([]);
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

    it("throws 409 when the conditional update matches no row (race condition) — untracked booking", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(returnRepository.requestReturn).mockResolvedValue(undefined as any);
      await expect(returnService.requestReturn(1, 1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("returns the updated booking on success — untracked booking (no quantity needed)", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      const updated = { id: 1, status: "return_requested" };
      vi.mocked(returnRepository.requestReturn).mockResolvedValue(updated as any);
      await expect(returnService.requestReturn(1, 1)).resolves.toEqual(updated);
    });

    it("serialized booking: defaults to requesting ALL outstanding units when no quantity given", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(rentalBookingItemRepository.getOutstandingItems).mockResolvedValue([
        { id: 11, equipmentItemId: 101 },
        { id: 12, equipmentItemId: 102 },
        { id: 13, equipmentItemId: 103 },
      ] as any);
      vi.mocked(returnRepository.requestReturn).mockResolvedValue({ id: 1, status: "return_requested" } as any);

      await returnService.requestReturn(1, 1);

      expect(rentalBookingItemRepository.markItemsReturnRequested).toHaveBeenCalledWith(
        [11, 12, 13],
        expect.any(Date),
        expect.anything(),
      );
    });

    it("serialized booking: requests only the given quantity, picking the first N outstanding items", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(rentalBookingItemRepository.getOutstandingItems).mockResolvedValue([
        { id: 11, equipmentItemId: 101 },
        { id: 12, equipmentItemId: 102 },
        { id: 13, equipmentItemId: 103 },
      ] as any);
      vi.mocked(returnRepository.requestReturn).mockResolvedValue({ id: 1, status: "return_requested" } as any);

      await returnService.requestReturn(1, 1, 2);

      expect(rentalBookingItemRepository.markItemsReturnRequested).toHaveBeenCalledWith(
        [11, 12],
        expect.any(Date),
        expect.anything(),
      );
    });

    it("serialized booking: throws 400 when quantity exceeds outstanding units", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(rentalBookingItemRepository.getOutstandingItems).mockResolvedValue([
        { id: 11, equipmentItemId: 101 },
      ] as any);

      await expect(returnService.requestReturn(1, 1, 5)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("serialized booking: throws 409 when the request loses a race (state changed mid-transaction)", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(rentalBookingItemRepository.getOutstandingItems).mockResolvedValue([
        { id: 11, equipmentItemId: 101 },
      ] as any);
      vi.mocked(returnRepository.requestReturn).mockResolvedValue(undefined as any);

      await expect(returnService.requestReturn(1, 1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("serialized booking: throws 400 for a zero/negative quantity", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        userId: 1,
        status: "active",
      } as any);
      vi.mocked(rentalBookingItemRepository.getOutstandingItems).mockResolvedValue([
        { id: 11, equipmentItemId: 101 },
      ] as any);

      await expect(returnService.requestReturn(1, 1, 0)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe("getPendingReturnRequests", () => {
    it("paginates, flags overdue active bookings, and attaches pendingItems per booking", async () => {
      const now = Date.now();
      vi.mocked(returnRepository.getPendingReturnRequests).mockResolvedValue({
        data: [
          { id: 1, status: "active", rentTo: new Date(now - 1000) },
          { id: 2, status: "active", rentTo: new Date(now + 100000) },
        ],
        total: 42,
      } as any);
      vi.mocked(rentalBookingItemRepository.getPendingReturnItemsForBookings).mockResolvedValue([
        { rentalBookingId: 1, id: 21, equipmentItemId: 101, serialNumber: "CAM-001" },
      ] as any);

      const result = await returnService.getPendingReturnRequests(2, 10, "drill");

      expect(returnRepository.getPendingReturnRequests).toHaveBeenCalledWith(2, 10, "drill");
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.data[0]!.computedStatus).toBe("overdue");
      expect(result.data[1]!.computedStatus).toBe("active");
      expect(result.data[0]!.pendingItems).toEqual([
        { id: 21, equipmentItemId: 101, serialNumber: "CAM-001" },
      ]);
      expect(result.data[1]!.pendingItems).toEqual([]);
    });
  });

  describe("confirmReturn — legacy / untracked booking", () => {
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
      await expect(returnService.confirmReturn(1, { condition: "good" })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 409 when the booking is not in 'return_requested' state", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        ...baseBooking,
        status: "active",
      } as any);
      await expect(returnService.confirmReturn(1, { condition: "good" })).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("throws 400 when neither condition nor items are provided", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(baseBooking as any);
      await expect(returnService.confirmReturn(1, {})).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when the damage fee exceeds 1.5x the equipment price", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(baseBooking as any);
      await expect(
        returnService.confirmReturn(1, { condition: "damaged", damageFee: 200 }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("restores stock and creates no fine for a not-late 'good' return", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);

      const result = await returnService.confirmReturn(1, { condition: "good" });

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

      const result = await returnService.confirmReturn(1, {
        condition: "damaged",
        conditionNotes: "scratched",
        damageFee: 150,
      });

      expect(fineRepository.createFine).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 150, reason: "damaged:150" }),
        expect.anything(),
      );
      expect(returnRepository.restoreEquipmentStock).toHaveBeenCalled();
      expect(result.fine).toMatchObject({ id: 55, totalFine: 150 });
    });

    it("creates no fine for a not-late 'damaged' return with no damage fee supplied", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);

      const result = await returnService.confirmReturn(1, { condition: "damaged" });

      expect(fineRepository.createFine).not.toHaveBeenCalled();
      expect(result.fine).toBeNull();
    });

    it("syncs assigned physical units to their reported condition on a non-'good' return", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
      vi.mocked(fineRepository.createFine).mockResolvedValue({ id: 58 } as any);
      vi.mocked(rentalBookingItemRepository.getAssignedItemIds).mockResolvedValue([101]);

      await returnService.confirmReturn(1, { condition: "damaged", damageFee: 50 });

      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [101],
        "damaged",
        expect.anything(),
      );
    });

    it("charges replacement cost and does NOT restore stock for a 'lost' item", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(fineRepository.createFine).mockResolvedValue({ id: 56 } as any);

      const result = await returnService.confirmReturn(1, { condition: "lost" });

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

      const result = await returnService.confirmReturn(1, { condition: "good" });

      // 7 days @ ₹100 + 3 days @ ₹200 = 700 + 600 = 1300
      expect(result.fine).toMatchObject({ lateFee: 1300, totalFine: 1300 });
    });

    it("throws 409 when the conditional status update matches no row (race condition)", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(baseBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue(undefined as any);

      await expect(returnService.confirmReturn(1, { condition: "good" })).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("syncs assigned physical units to 'available' on a 'good' return (legacy assigned-but-not-pending items)", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
      vi.mocked(rentalBookingItemRepository.getAssignedItemIds).mockResolvedValue([101, 102]);

      await returnService.confirmReturn(1, { condition: "good" });

      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [101, 102],
        "available",
        expect.anything(),
      );
    });

    it("does not touch equipment items when none were assigned to the booking", async () => {
      const notLateBooking = { ...baseBooking, rentTo: new Date(Date.now() + 60 * 60 * 1000) };
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(notLateBooking as any);
      vi.mocked(returnRepository.confirmReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);

      await returnService.confirmReturn(1, { condition: "good" });

      expect(equipmentItemRepository.updateEquipmentItemsStatus).not.toHaveBeenCalled();
    });
  });

  describe("confirmReturn — serialized / per-unit booking", () => {
    const baseBooking = {
      id: 1,
      status: "return_requested",
      userId: 1,
      equipmentId: 9,
      quantity: 3,
      rentTo: new Date(Date.now() + 60 * 60 * 1000), // not late
      equipment: { price: 100 },
    };

    const pendingItems = [
      { id: 201, equipmentItemId: 101, serialNumber: "CAM-001" },
      { id: 202, equipmentItemId: 102, serialNumber: "CAM-002" },
      { id: 203, equipmentItemId: 103, serialNumber: "CAM-003" },
    ];

    beforeEach(() => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue(baseBooking as any);
      vi.mocked(rentalBookingItemRepository.getPendingReturnItems).mockResolvedValue(pendingItems as any);
      vi.mocked(rentalBookingItemRepository.countOutstandingItems).mockResolvedValue(0);
      vi.mocked(returnRepository.finalizeSerializedReturn).mockResolvedValue({ id: 1, status: "returned" } as any);
      vi.mocked(returnRepository.restoreEquipmentStock).mockResolvedValue({} as any);
    });

    it("throws 500 when the booking's equipment data is missing", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        ...baseBooking,
        equipment: undefined,
      } as any);

      await expect(
        returnService.confirmReturn(1, {
          items: [{ equipmentItemId: 101, condition: "good" }],
        }),
      ).rejects.toMatchObject({ statusCode: 500 });
    });

    it("throws 400 when a damaged item is submitted without a damage fee", async () => {
      await expect(
        returnService.confirmReturn(1, {
          items: [
            { equipmentItemId: 101, condition: "damaged" },
            { equipmentItemId: 102, condition: "good" },
            { equipmentItemId: 103, condition: "good" },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when 'items' is missing for a serialized booking", async () => {
      await expect(returnService.confirmReturn(1, { condition: "good" })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("throws 400 when submitted items don't exactly match the pending set", async () => {
      await expect(
        returnService.confirmReturn(1, {
          items: [
            { equipmentItemId: 101, condition: "good" },
            { equipmentItemId: 102, condition: "good" },
            // missing 103
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("mixes good/damaged/lost across units into one combined itemized fine", async () => {
      const result = await returnService.confirmReturn(1, {
        items: [
          { equipmentItemId: 101, condition: "good" },
          { equipmentItemId: 102, condition: "damaged", damageFee: 50 },
          { equipmentItemId: 103, condition: "lost" },
        ],
      });

      expect(fineRepository.createFine).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 150, // 50 damage + 100 replacement
          reason: "CAM-002:damaged:50,CAM-003:lost:100",
        }),
        expect.anything(),
      );

      // available (good) + damaged both restore stock, lost does not
      expect(returnRepository.restoreEquipmentStock).toHaveBeenCalledWith(9, 2, expect.anything());

      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [101],
        "available",
        expect.anything(),
      );
      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [102],
        "damaged",
        expect.anything(),
      );
      expect(equipmentItemRepository.updateEquipmentItemsStatus).toHaveBeenCalledWith(
        [103],
        "lost",
        expect.anything(),
      );

      expect(result.fine).toMatchObject({ totalFine: 150 });
      expect(result.items).toEqual([
        { equipmentItemId: 101, condition: "good", damageFee: null },
        { equipmentItemId: 102, condition: "damaged", damageFee: 50 },
        { equipmentItemId: 103, condition: "lost", damageFee: null },
      ]);
    });

    it("adds a late fee to the combined fine when the booking is overdue", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        ...baseBooking,
        rentTo: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days late
      } as any);

      const result = await returnService.confirmReturn(1, {
        items: [
          { equipmentItemId: 101, condition: "good" },
          { equipmentItemId: 102, condition: "good" },
          { equipmentItemId: 103, condition: "good" },
        ],
      });

      expect(fineRepository.createFine).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 300, reason: "late:300" }),
        expect.anything(),
      );
      expect(result.fine).toMatchObject({ totalFine: 300 });
    });

    it("does not restore equipment stock when every returned unit is lost", async () => {
      const result = await returnService.confirmReturn(1, {
        items: [
          { equipmentItemId: 101, condition: "lost" },
          { equipmentItemId: 102, condition: "lost" },
          { equipmentItemId: 103, condition: "lost" },
        ],
      });

      expect(returnRepository.restoreEquipmentStock).not.toHaveBeenCalled();
      expect(result.fine).toMatchObject({ totalFine: 300 });
    });

    it("throws 400 when a per-item damage fee exceeds the 1.5x cap", async () => {
      await expect(
        returnService.confirmReturn(1, {
          items: [
            { equipmentItemId: 101, condition: "damaged", damageFee: 200 },
            { equipmentItemId: 102, condition: "good" },
            { equipmentItemId: 103, condition: "good" },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("booking stays 'active' (not fully returned) when units remain outstanding", async () => {
      vi.mocked(rentalBookingItemRepository.countOutstandingItems).mockResolvedValue(2);
      vi.mocked(returnRepository.finalizeSerializedReturn).mockResolvedValue({ id: 1, status: "active" } as any);

      await returnService.confirmReturn(1, {
        items: [
          { equipmentItemId: 101, condition: "good" },
          { equipmentItemId: 102, condition: "good" },
          { equipmentItemId: 103, condition: "good" },
        ],
      });

      expect(returnRepository.finalizeSerializedReturn).toHaveBeenCalledWith(1, false, expect.anything());
    });

    it("marks the booking fully 'returned' once no units remain outstanding", async () => {
      await returnService.confirmReturn(1, {
        items: [
          { equipmentItemId: 101, condition: "good" },
          { equipmentItemId: 102, condition: "good" },
          { equipmentItemId: 103, condition: "good" },
        ],
      });

      expect(returnRepository.finalizeSerializedReturn).toHaveBeenCalledWith(1, true, expect.anything());
    });

    it("throws 409 when another admin already processed this booking (race condition)", async () => {
      vi.mocked(returnRepository.finalizeSerializedReturn).mockResolvedValue(undefined as any);

      await expect(
        returnService.confirmReturn(1, {
          items: [
            { equipmentItemId: 101, condition: "good" },
            { equipmentItemId: 102, condition: "good" },
            { equipmentItemId: 103, condition: "good" },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
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

    it("returns the updated booking on success — untracked booking", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        status: "return_requested",
      } as any);
      const updated = { id: 1, status: "active", rejectionReason: "reason" };
      vi.mocked(returnRepository.rejectReturn).mockResolvedValue(updated as any);
      await expect(returnService.rejectReturn(1, "reason")).resolves.toEqual(updated);
    });

    it("clears returnRequestedAt on the pending items for a serialized booking", async () => {
      vi.mocked(returnRepository.getBookingForReturn).mockResolvedValue({
        status: "return_requested",
      } as any);
      vi.mocked(rentalBookingItemRepository.getPendingReturnItems).mockResolvedValue([
        { id: 201, equipmentItemId: 101, serialNumber: "CAM-001" },
        { id: 202, equipmentItemId: 102, serialNumber: "CAM-002" },
      ] as any);
      vi.mocked(returnRepository.rejectReturn).mockResolvedValue({ id: 1, status: "active" } as any);

      await returnService.rejectReturn(1, "damaged serials look wrong, come in person");

      expect(rentalBookingItemRepository.clearReturnRequested).toHaveBeenCalledWith(
        [201, 202],
        expect.anything(),
      );
    });
  });
});
