import z from "zod";

export const confirmReturnSchema = z
  .object({
    condition: z.enum(["good", "damaged", "lost"], {
      message: "Condition must be 'good', 'damaged', or 'lost'!",
    }),
    conditionNotes: z
      .string()
      .trim()
      .optional(),
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
    {
      message: "Damage fee is required when condition is 'damaged'!",
      path: ["damageFee"],
    },
  )
  .refine(
    (data) => {
      if (data.condition !== "damaged") return data.damageFee === undefined;
      return true;
    },
    {
      message: "Damage fee is only allowed when condition is 'damaged'!",
      path: ["damageFee"],
    },
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
