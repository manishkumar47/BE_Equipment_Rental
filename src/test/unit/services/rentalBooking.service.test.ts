import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../database/repository/rentalBooking.repository.js");
vi.mock("../../../util/emails/bookingEmail.js");
vi.mock("../../../database/db-connection.js", () => ({
  default: { transaction: vi.fn() },
}));

import * as rentalBookingRepository from "../../../database/repository/rentalBooking.repository.js";
import { sendBookingComplete } from "../../../util/emails/bookingEmail.js";
import db from "../../../database/db-connection.js";
import { equipment, rentalBooking as rentalBookingTable } from "../../../database/schema/schema.js";
import * as rentalBookingService from "../../../service/rentalBooking.service.js";

beforeEach(() => {
  vi.mocked(sendBookingComplete).mockResolvedValue(undefined as any);
});

describe("rentalBooking.service", () => {
  describe("createRentalBooking", () => {
    it("sends a confirmation email and returns the booking when user+equipment are present", async () => {
      const bookingRow = {
        id: 1,
        quantity: 2,
        rentFrom: new Date("2026-09-01"),
        rentTo: new Date("2026-09-05"),
        user: { name: "Alice", email: "a@b.com" },
        equipment: { name: "Drill", description: "desc", price: 100 },
      };
      vi.mocked(rentalBookingRepository.createRentalBooking).mockResolvedValue(bookingRow as any);

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
      vi.mocked(rentalBookingRepository.createRentalBooking).mockResolvedValue({ id: 1 } as any);

      await rentalBookingService.createRentalBooking({} as any);

      expect(sendBookingComplete).not.toHaveBeenCalled();
    });

    it("throws a 500 AppError when the repository returns nothing", async () => {
      vi.mocked(rentalBookingRepository.createRentalBooking).mockResolvedValue(undefined as any);

      await expect(rentalBookingService.createRentalBooking({} as any)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("wraps an unexpected repository error into an AppError", async () => {
      vi.mocked(rentalBookingRepository.createRentalBooking).mockRejectedValue(
        new Error("db exploded"),
      );

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

    it("restores equipment stock when the booking was not already returned", async () => {
      vi.mocked(rentalBookingRepository.getRentalBookingById).mockResolvedValue({
        id: 1,
        status: "active",
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
