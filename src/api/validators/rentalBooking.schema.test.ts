import { describe, it, expect } from "vitest";
import { rentalBookingSchema, rejectBookingRequestSchema } from "./rentalBooking.schema.js";

const future = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();

describe("rentalBookingSchema", () => {
  it("accepts a valid future booking window", () => {
    const result = rentalBookingSchema.safeParse({
      rentFrom: future(60 * 60 * 1000),
      rentTo: future(2 * 60 * 60 * 1000),
      quantity: 2,
      equipmentId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when rentFrom is in the past", () => {
    const result = rentalBookingSchema.safeParse({
      rentFrom: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      rentTo: future(60 * 60 * 1000),
      quantity: 1,
      equipmentId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when rentTo is before rentFrom", () => {
    const result = rentalBookingSchema.safeParse({
      rentFrom: future(2 * 60 * 60 * 1000),
      rentTo: future(60 * 60 * 1000),
      quantity: 1,
      equipmentId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts rentTo equal to rentFrom", () => {
    const sameInstant = future(60 * 60 * 1000);
    const result = rentalBookingSchema.safeParse({
      rentFrom: sameInstant,
      rentTo: sameInstant,
      quantity: 1,
      equipmentId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative quantity", () => {
    const result = rentalBookingSchema.safeParse({
      rentFrom: future(60 * 60 * 1000),
      rentTo: future(2 * 60 * 60 * 1000),
      quantity: 0,
      equipmentId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive equipmentId", () => {
    const result = rentalBookingSchema.safeParse({
      rentFrom: future(60 * 60 * 1000),
      rentTo: future(2 * 60 * 60 * 1000),
      quantity: 1,
      equipmentId: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectBookingRequestSchema", () => {
  it("accepts a non-empty rejection reason", () => {
    expect(
      rejectBookingRequestSchema.safeParse({ rejectionReason: "No stock at pickup" }).success,
    ).toBe(true);
  });

  it("rejects an empty rejection reason", () => {
    expect(rejectBookingRequestSchema.safeParse({ rejectionReason: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only rejection reason", () => {
    expect(rejectBookingRequestSchema.safeParse({ rejectionReason: "   " }).success).toBe(false);
  });
});
