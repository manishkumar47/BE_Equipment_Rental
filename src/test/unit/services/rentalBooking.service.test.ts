import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/repository/rentalBooking.repository.js");
vi.mock("../../../database/repository/rentalBookingItem.repository.js");
vi.mock("../../../database/repository/equipmentItem.repository.js");
vi.mock("../../../util/emails/bookingEmail.js");
vi.mock("../../../database/db-connection.js", () => ({
  default: { transaction: vi.fn() },
}));

import * as rentalBookingRepository from "../../../database/repository/rentalBooking.repository.js";
import * as rentalBookingItemRepository from "../../../database/repository/rentalBookingItem.repository.js";
import * as equipmentItemRepository from "../../../database/repository/equipmentItem.repository.js";
import { sendBookingComplete } from "../../../util/emails/bookingEmail.js";
import db from "../../../database/db-connection.js";
import { equipment, rentalBooking as rentalBookingTable } from "../../../database/schema/schema.js";
import * as rentalBookingService from "../../../service/rentalBooking.service.js";

const fakeEquipmentSelectTx = (quantity: number) => ({
  select: () => ({ from: () => ({ where: () => Promise.resolve([{ quantity }]) }) }),
  update: () => ({
    set: () => ({
      where: () => {
        const p: any = Promise.resolve(undefined);
        p.returning = () => Promise.resolve([]);
        return p;
      },
    }),
  }),
});

beforeEach(() => {
  vi.mocked(sendBookingComplete).mockResolvedValue(undefined as any);
});

describe("rentalBooking.service", () => {
  describe("createRentalBooking", () => {
    beforeEach(() => {
      // The stock decrement lives inside db.transaction — route the fake
      // transaction straight through to whatever repository calls it makes,
      // since decrementEquipmentStock/insertRentalBooking are themselves
      // module-mocked (auto-mock from vi.mock at the top of this file).
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb({} as any));
    });

    it("sends a confirmation email and returns the booking when user+equipment are present", async () => {
      const bookingRow = {
        id: 1,
        quantity: 2,
        rentFrom: new Date("2026-09-01"),
        rentTo: new Date("2026-09-05"),
        user: { name: "Alice", email: "a@b.com" },
        equipment: { name: "Drill", description: "desc", price: 100 },
      };
      vi.mocked(rentalBookingRepository.decrementEquipmentStock).mockResolvedValue({
        id: 1,
        quantity: 3,
      } as any);
      vi.mocked(rentalBookingRepository.insertRentalBooking).mockResolvedValue({ id: 1 } as any);
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue(bookingRow as any);

      const result = await rentalBookingService.createRentalBooking({
        userId: 1,
        equipmentId: 1,
        quantity: 2,
        rentFrom: bookingRow.rentFrom,
        rentTo: bookingRow.rentTo,
      } as any);

      expect(result).toEqual(bookingRow);
      expect(sendBookingComplete).toHaveBeenCalledWith({
        user: { name: "Alice", email: "a@b.com" },
        equipment: { name: "Drill", description: "desc", price: 100 },
        booking: {
          id: 1,
          quantity: 2,
          rentFrom: bookingRow.rentFrom,
          rentTo: bookingRow.rentTo,
        },
      });
    });

    it("skips the confirmation email when the joined user or equipment is missing", async () => {
      vi.mocked(rentalBookingRepository.decrementEquipmentStock).mockResolvedValue({
        id: 1,
        quantity: 3,
      } as any);
      vi.mocked(rentalBookingRepository.insertRentalBooking).mockResolvedValue({ id: 1 } as any);
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({ id: 1 } as any);

      await rentalBookingService.createRentalBooking({} as any);

      expect(sendBookingComplete).not.toHaveBeenCalled();
    });

    it("throws a 409 AppError when the conditional stock decrement matches no row (insufficient stock)", async () => {
      vi.mocked(rentalBookingRepository.decrementEquipmentStock).mockResolvedValue(
        undefined as any,
      );

      await expect(rentalBookingService.createRentalBooking({} as any)).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(rentalBookingRepository.insertRentalBooking).not.toHaveBeenCalled();
    });

    it("throws a 500 AppError when the repository returns nothing", async () => {
      vi.mocked(rentalBookingRepository.decrementEquipmentStock).mockResolvedValue({
        id: 1,
        quantity: 3,
      } as any);
      vi.mocked(rentalBookingRepository.insertRentalBooking).mockResolvedValue(undefined as any);

      await expect(rentalBookingService.createRentalBooking({} as any)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("wraps an unexpected repository error into an AppError", async () => {
      vi.mocked(db.transaction).mockRejectedValue(new Error("db exploded"));

      await expect(rentalBookingService.createRentalBooking({} as any)).rejects.toMatchObject({
        statusCode: 500,
        message: "db exploded",
      });
    });
  });

  describe("getRentalBookingById", () => {
    it("delegates to the repository", async () => {
      const row = { id: 1 };
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue(row as any);
      await expect(rentalBookingService.getRentalBookingById(1)).resolves.toEqual(row);
    });
  });

  describe("deleteRentalBooking", () => {
    it("throws 404 when the booking does not exist", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue(undefined as any);
      await expect(rentalBookingService.deleteRentalBooking(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("blocks deletion while the booking is active (equipment checked out)", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        id: 1,
        status: "active",
        equipmentId: 7,
        quantity: 3,
      } as any);

      await expect(rentalBookingService.deleteRentalBooking(1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("blocks deletion while a return is pending confirmation", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        id: 1,
        status: "return_requested",
        equipmentId: 7,
        quantity: 3,
      } as any);

      await expect(rentalBookingService.deleteRentalBooking(1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("restores equipment stock when the booking was not already returned", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        id: 1,
        status: "requested",
        equipmentId: 7,
        quantity: 3,
      } as any);

      const updateCalls: any[] = [];
      const fakeTx = {
        select: () => ({ from: () => ({ where: () => Promise.resolve([{ quantity: 4 }]) }) }),
        update: (table: any) => {
          updateCalls.push(table);
          return {
            set: () => ({
              where: () => {
                const result = table === rentalBookingTable ? [{ id: 1, isDeleted: true }] : undefined;
                const p: any = Promise.resolve(result);
                p.returning = () => Promise.resolve(result);
                return p;
              },
            }),
          };
        },
      };
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb(fakeTx));

      const result = await rentalBookingService.deleteRentalBooking(1);

      expect(result).toEqual({ id: 1, isDeleted: true });
      expect(updateCalls).toEqual([equipment, rentalBookingTable]);
    });

    it("does not restore stock when the booking was already returned", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        id: 2,
        status: "returned",
        equipmentId: 7,
        quantity: 3,
      } as any);

      const updateCalls: any[] = [];
      const fakeTx = {
        select: () => ({ from: () => ({ where: () => Promise.resolve([{ quantity: 4 }]) }) }),
        update: (table: any) => {
          updateCalls.push(table);
          return {
            set: () => ({
              where: () => {
                const p: any = Promise.resolve([{ id: 2, isDeleted: true }]);
                p.returning = () => Promise.resolve([{ id: 2, isDeleted: true }]);
                return p;
              },
            }),
          };
        },
      };
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb(fakeTx));

      await rentalBookingService.deleteRentalBooking(2);

      expect(updateCalls).toEqual([rentalBookingTable]);
    });

    it("does not restore stock when the booking was already rejected", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        id: 3,
        status: "rejected",
        equipmentId: 7,
        quantity: 3,
      } as any);

      const updateCalls: any[] = [];
      const fakeTx = {
        select: () => ({ from: () => ({ where: () => Promise.resolve([{ quantity: 4 }]) }) }),
        update: (table: any) => {
          updateCalls.push(table);
          return {
            set: () => ({
              where: () => {
                const p: any = Promise.resolve([{ id: 3, isDeleted: true }]);
                p.returning = () => Promise.resolve([{ id: 3, isDeleted: true }]);
                return p;
              },
            }),
          };
        },
      };
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb(fakeTx));

      await rentalBookingService.deleteRentalBooking(3);

      expect(updateCalls).toEqual([rentalBookingTable]);
    });
  });

  describe("getPendingBookingRequests", () => {
    it("paginates and delegates to the repository", async () => {
      vi.mocked(rentalBookingRepository.getPendingBookingRequests).mockResolvedValue({
        data: [{ id: 1 }],
        total: 21,
      } as any);

      const result = await rentalBookingService.getPendingBookingRequests(2, 10, "drill");

      expect(rentalBookingRepository.getPendingBookingRequests).toHaveBeenCalledWith(2, 10, "drill");
      expect(result).toEqual({ data: [{ id: 1 }], total: 21, page: 2, limit: 10, totalPages: 3 });
    });
  });

  describe("approveBookingRequest", () => {
    it("throws 404 when the booking does not exist", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue(undefined as any);
      await expect(rentalBookingService.approveBookingRequest(1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 409 when the booking is not 'requested'", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "active",
      } as any);
      await expect(rentalBookingService.approveBookingRequest(1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("throws 409 when the conditional approve matches no row (race condition)", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "requested",
        equipmentId: 7,
        quantity: 2,
      } as any);
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb({}));
      vi.mocked(rentalBookingRepository.approveBooking).mockResolvedValue(undefined as any);

      await expect(rentalBookingService.approveBookingRequest(1)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("auto-assigns available units when there are enough tracked ones", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "requested",
        equipmentId: 7,
        quantity: 2,
      } as any);
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb({}));
      vi.mocked(rentalBookingRepository.approveBooking).mockResolvedValue({
        id: 1,
        status: "active",
      } as any);
      vi.mocked(equipmentItemRepository.getAvailableItemsForEquipment).mockResolvedValue([
        { id: 101 },
        { id: 102 },
      ] as any);
      vi.mocked(equipmentItemRepository.markEquipmentItemsRented).mockResolvedValue([101, 102]);

      const result = await rentalBookingService.approveBookingRequest(1);

      expect(result).toEqual({ id: 1, status: "active" });
      expect(equipmentItemRepository.getAvailableItemsForEquipment).toHaveBeenCalledWith(7, 2);
      expect(equipmentItemRepository.markEquipmentItemsRented).toHaveBeenCalledWith(
        [101, 102],
        expect.anything(),
      );
      expect(rentalBookingItemRepository.assignItemsToBooking).toHaveBeenCalledWith(
        1,
        [101, 102],
        expect.anything(),
      );
    });

    it("approves without assigning units when there aren't enough tracked ones available", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "requested",
        equipmentId: 7,
        quantity: 3,
      } as any);
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb({}));
      vi.mocked(rentalBookingRepository.approveBooking).mockResolvedValue({
        id: 1,
        status: "active",
      } as any);
      vi.mocked(equipmentItemRepository.getAvailableItemsForEquipment).mockResolvedValue([
        { id: 101 },
      ] as any);

      await rentalBookingService.approveBookingRequest(1);

      expect(equipmentItemRepository.markEquipmentItemsRented).not.toHaveBeenCalled();
      expect(rentalBookingItemRepository.assignItemsToBooking).not.toHaveBeenCalled();
    });
  });

  describe("rejectBookingRequest", () => {
    it("throws 404 when the booking does not exist", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue(undefined as any);
      await expect(
        rentalBookingService.rejectBookingRequest(1, "reason"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 409 when the booking is not 'requested'", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "active",
      } as any);
      await expect(
        rentalBookingService.rejectBookingRequest(1, "reason"),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("throws 409 when the conditional reject matches no row (race condition)", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "requested",
        equipmentId: 7,
        quantity: 2,
      } as any);
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb(fakeEquipmentSelectTx(4)));
      vi.mocked(rentalBookingRepository.rejectBooking).mockResolvedValue(undefined as any);

      await expect(
        rentalBookingService.rejectBookingRequest(1, "reason"),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("restores the reserved stock and returns the rejected booking", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        status: "requested",
        equipmentId: 7,
        quantity: 2,
      } as any);
      const fakeTx = fakeEquipmentSelectTx(4);
      const updateSpy = vi.spyOn(fakeTx, "update");
      vi.mocked(db.transaction).mockImplementation((cb: any) => cb(fakeTx));
      vi.mocked(rentalBookingRepository.rejectBooking).mockResolvedValue({
        id: 1,
        status: "rejected",
        rejectionReason: "reason",
      } as any);

      const result = await rentalBookingService.rejectBookingRequest(1, "reason");

      expect(result).toEqual({ id: 1, status: "rejected", rejectionReason: "reason" });
      expect(rentalBookingRepository.rejectBooking).toHaveBeenCalledWith(1, "reason", fakeTx);
      expect(updateSpy).toHaveBeenCalledWith(equipment);
    });
  });

  describe("getRentalBookingsByUserId", () => {
    it("delegates to the repository", async () => {
      const rows = [{ id: 1 }];
      vi.mocked(rentalBookingRepository.getRentalBookingsByUserId).mockResolvedValue(rows as any);
      await expect(rentalBookingService.getRentalBookingsByUserId(5)).resolves.toEqual(rows);
      expect(rentalBookingRepository.getRentalBookingsByUserId).toHaveBeenCalledWith(5);
    });
  });

  describe("getAllRentalBookings", () => {
    it("delegates to the repository", async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      vi.mocked(rentalBookingRepository.getAllRentalBookings).mockResolvedValue(rows as any);
      await expect(rentalBookingService.getAllRentalBookings()).resolves.toEqual(rows);
    });
  });

  describe("getPendingReminderBookings", () => {
    it("delegates to the repository", async () => {
      const rows = [{ id: 1 }];
      vi.mocked(rentalBookingRepository.getPendingReminderBookings).mockResolvedValue(rows as any);
      await expect(rentalBookingService.getPendingReminderBookings()).resolves.toEqual(rows);
    });
  });

  describe("markReminderSent", () => {
    it("delegates to the repository with the booking id", async () => {
      vi.mocked(rentalBookingRepository.markReminderSent).mockResolvedValue({
        id: 1,
        isReminderSent: true,
      } as any);

      await rentalBookingService.markReminderSent(1);
      expect(rentalBookingRepository.markReminderSent).toHaveBeenCalledWith(1);
    });
  });
});
