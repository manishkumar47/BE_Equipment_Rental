import z from "zod";

export const requestReturnSchema = z.object({
  // Omitted = return everything still outstanding (keeps old clients working
  // unchanged). Only meaningful for bookings with individually tracked units.
  quantity: z
    .number()
    .int()
    .positive("Quantity must be a positive integer!")
    .optional(),
});

const returnItemSchema = z
  .object({
    equipmentItemId: z.number().int().positive(),
    condition: z.enum(["good", "damaged", "lost"], {
      message: "Condition must be 'good', 'damaged', or 'lost'!",
    }),
    damageFee: z
      .number()
      .positive("Damage fee must be a positive number!")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.condition === "damaged") return data.damageFee !== undefined;
      return true;
    },
    { message: "Damage fee is required when condition is 'damaged'!", path: ["damageFee"] },
  )
  .refine(
    (data) => {
      if (data.condition !== "damaged") return data.damageFee === undefined;
      return true;
    },
    { message: "Damage fee is only allowed when condition is 'damaged'!", path: ["damageFee"] },
  );

export const confirmReturnSchema = z
  .object({
    // Legacy / untracked-equipment path
    condition: z
      .enum(["good", "damaged", "lost"], {
        message: "Condition must be 'good', 'damaged', or 'lost'!",
      })
      .optional(),
    conditionNotes: z.string().trim().optional(),
    damageFee: z.number().positive("Damage fee must be a positive number!").optional(),
    // Serialized / per-unit path
    items: z.array(returnItemSchema).min(1).optional(),
  })
  .refine((data) => !!data.condition || !!data.items, {
    message: "Provide either 'condition' (untracked equipment) or 'items' (per-unit tracked equipment).",
    path: ["condition"],
  })
  .refine((data) => !(data.condition && data.items), {
    message: "Provide either 'condition' or 'items', not both.",
    path: ["items"],
  })
  .refine(
    (data) => {
      if (data.items) return true; // per-item damageFee rules already enforced above
      if (data.condition === "damaged") return data.damageFee !== undefined;
      return true;
    },
    { message: "Damage fee is required when condition is 'damaged'!", path: ["damageFee"] },
  )
  .refine(
    (data) => {
      if (data.items) return true;
      if (data.condition !== "damaged") return data.damageFee === undefined;
      return true;
    },
    { message: "Damage fee is only allowed when condition is 'damaged'!", path: ["damageFee"] },
  );

export const rejectReturnSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Rejection reason is required!"),
});

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive("Page must be a positive integer!")
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .positive("Limit must be a positive integer!")
    .max(100, "Limit cannot exceed 100!")
    .default(20),
  search: z.string().trim().optional(),
});
