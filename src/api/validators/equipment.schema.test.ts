import { describe, it, expect } from "vitest";
import { equipmentSchema } from "./equipment.schema.js";

describe("equipmentSchema", () => {
  it("accepts a fully specified valid equipment payload", () => {
    const result = equipmentSchema.safeParse({
      name: "Drill",
      description: "Cordless drill",
      quantity: 5,
      price: 100,
      imageUrl: "https://example.com/drill.png",
      categoryId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("defaults quantity to 0 when omitted", () => {
    const result = equipmentSchema.safeParse({
      name: "Drill",
      price: 100,
      categoryId: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(0);
    }
  });

  it("rejects an empty name", () => {
    expect(
      equipmentSchema.safeParse({ name: "", price: 100, categoryId: 1 }).success,
    ).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(
      equipmentSchema.safeParse({ name: "Drill", price: -10, categoryId: 1 }).success,
    ).toBe(false);
  });

  it("rejects a negative quantity", () => {
    expect(
      equipmentSchema.safeParse({
        name: "Drill",
        price: 100,
        quantity: -1,
        categoryId: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects a missing categoryId", () => {
    expect(equipmentSchema.safeParse({ name: "Drill", price: 100 }).success).toBe(
      false,
    );
  });
});
