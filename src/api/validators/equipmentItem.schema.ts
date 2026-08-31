import z from "zod";

export const equipmentItemStatusEnum = z.enum([
  "available",
  "rented",
  "under_repair",
  "damaged",
  "lost",
  "retired",
]);

export const createEquipmentItemSchema = z.object({
  serialNumber: z.string().trim().min(1, "Please enter a valid serial number / asset tag!"),
  status: equipmentItemStatusEnum.optional().default("available"),
  conditionNotes: z.string().trim().optional(),
});

export const bulkCreateEquipmentItemSchema = z.object({
  items: z
    .array(
      z.object({
        serialNumber: z.string().trim().min(1, "Please enter a valid serial number / asset tag!"),
        status: equipmentItemStatusEnum.optional().default("available"),
        conditionNotes: z.string().trim().optional(),
      }),
    )
    .min(1, "Provide at least one item!"),
});

export const updateEquipmentItemSchema = z
  .object({
    serialNumber: z.string().trim().min(1, "Please enter a valid serial number / asset tag!").optional(),
    status: equipmentItemStatusEnum.optional(),
    conditionNotes: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update!",
  });
