import { describe, it, expect } from "vitest";
import { equipmentSchema, equipmentListQuerySchema } from "./equipment.schema.js";

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

describe("equipmentListQuerySchema", () => {
  it("transforms inStockOnly 'true' to a boolean true", () => {
    const result = equipmentListQuerySchema.safeParse({ inStockOnly: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inStockOnly).toBe(true);
    }
  });

  it("transforms inStockOnly 'false' to a boolean false", () => {
    const result = equipmentListQuerySchema.safeParse({ inStockOnly: "false" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inStockOnly).toBe(false);
    }
  });

  it("transforms a missing inStockOnly to false", () => {
    const result = equipmentListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inStockOnly).toBe(false);
    }
  });

  it("rejects an inStockOnly value other than 'true'/'false'", () => {
    expect(equipmentListQuerySchema.safeParse({ inStockOnly: "yes" }).success).toBe(
      false,
    );
  });

  it("accepts a categoryId and a valid sortBy value", () => {
    const result = equipmentListQuerySchema.safeParse({
      categoryId: "3",
      sortBy: "price_asc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBe(3);
      expect(result.data.sortBy).toBe("price_asc");
    }
  });

  it("rejects an unrecognized sortBy value", () => {
    expect(
      equipmentListQuerySchema.safeParse({ sortBy: "cheapest_first" }).success,
    ).toBe(false);
  });
});
