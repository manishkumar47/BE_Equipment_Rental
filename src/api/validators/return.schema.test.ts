import { describe, it, expect } from "vitest";
import {
  confirmReturnSchema,
  rejectReturnSchema,
  paginationSchema,
} from "./return.schema.js";

describe("confirmReturnSchema", () => {
  it("accepts condition 'good' without a damage fee", () => {
    expect(confirmReturnSchema.safeParse({ condition: "good" }).success).toBe(true);
  });

  it("accepts condition 'lost' without a damage fee", () => {
    expect(confirmReturnSchema.safeParse({ condition: "lost" }).success).toBe(true);
  });

  it("requires a damage fee when condition is 'damaged'", () => {
    const result = confirmReturnSchema.safeParse({ condition: "damaged" });
    expect(result.success).toBe(false);
  });

  it("accepts condition 'damaged' with a positive damage fee", () => {
    const result = confirmReturnSchema.safeParse({
      condition: "damaged",
      damageFee: 250,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a damage fee supplied for a non-'damaged' condition", () => {
    const result = confirmReturnSchema.safeParse({ condition: "good", damageFee: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid condition value", () => {
    expect(confirmReturnSchema.safeParse({ condition: "broken" }).success).toBe(false);
  });

  it("rejects a non-positive damage fee", () => {
    const result = confirmReturnSchema.safeParse({
      condition: "damaged",
      damageFee: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a per-unit 'items' array with a damaged unit carrying a damage fee", () => {
    const result = confirmReturnSchema.safeParse({
      items: [{ equipmentItemId: 1, condition: "damaged", damageFee: 50 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a per-unit 'items' entry that is 'damaged' without a damage fee", () => {
    const result = confirmReturnSchema.safeParse({
      items: [{ equipmentItemId: 1, condition: "damaged" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a per-unit 'items' entry with a damage fee for a non-'damaged' condition", () => {
    const result = confirmReturnSchema.safeParse({
      items: [{ equipmentItemId: 1, condition: "good", damageFee: 50 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects providing both 'condition' and 'items'", () => {
    const result = confirmReturnSchema.safeParse({
      condition: "good",
      items: [{ equipmentItemId: 1, condition: "good" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectReturnSchema", () => {
  it("accepts a non-empty rejection reason", () => {
    expect(
      rejectReturnSchema.safeParse({ rejectionReason: "Wrong item returned" }).success,
    ).toBe(true);
  });

  it("rejects an empty rejection reason", () => {
    expect(rejectReturnSchema.safeParse({ rejectionReason: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only rejection reason", () => {
    expect(rejectReturnSchema.safeParse({ rejectionReason: "   " }).success).toBe(
      false,
    );
  });
});

describe("paginationSchema", () => {
  it("defaults page to 1 and limit to 20 when omitted", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces string query params to numbers", () => {
    const result = paginationSchema.safeParse({ page: "2", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects a limit greater than 100", () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("rejects a non-positive page", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});
