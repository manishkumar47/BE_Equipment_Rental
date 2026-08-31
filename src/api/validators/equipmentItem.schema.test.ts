import { describe, it, expect } from "vitest";
import {
  createEquipmentItemSchema,
  bulkCreateEquipmentItemSchema,
  updateEquipmentItemSchema,
} from "./equipmentItem.schema.js";

describe("createEquipmentItemSchema", () => {
  it("accepts a serial number and defaults status to 'available'", () => {
    const result = createEquipmentItemSchema.safeParse({ serialNumber: "DRILL-1-001" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("available");
    }
  });

  it("rejects an empty serial number", () => {
    expect(createEquipmentItemSchema.safeParse({ serialNumber: "" }).success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    expect(
      createEquipmentItemSchema.safeParse({ serialNumber: "A-1", status: "broken" }).success,
    ).toBe(false);
  });

  it("accepts any of the defined status values", () => {
    for (const status of ["available", "rented", "under_repair", "damaged", "lost", "retired"]) {
      expect(
        createEquipmentItemSchema.safeParse({ serialNumber: "A-1", status }).success,
      ).toBe(true);
    }
  });
});

describe("bulkCreateEquipmentItemSchema", () => {
  it("accepts a non-empty items array", () => {
    const result = bulkCreateEquipmentItemSchema.safeParse({
      items: [{ serialNumber: "A-1" }, { serialNumber: "A-2" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty items array", () => {
    expect(bulkCreateEquipmentItemSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("rejects an item missing a serial number", () => {
    expect(bulkCreateEquipmentItemSchema.safeParse({ items: [{}] }).success).toBe(false);
  });
});

describe("updateEquipmentItemSchema", () => {
  it("accepts a status-only update", () => {
    expect(updateEquipmentItemSchema.safeParse({ status: "damaged" }).success).toBe(true);
  });

  it("accepts a serialNumber-only update", () => {
    expect(updateEquipmentItemSchema.safeParse({ serialNumber: "NEW-1" }).success).toBe(true);
  });

  it("rejects an empty update payload", () => {
    expect(updateEquipmentItemSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    expect(updateEquipmentItemSchema.safeParse({ status: "broken" }).success).toBe(false);
  });
});
