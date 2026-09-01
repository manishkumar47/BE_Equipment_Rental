import z from "zod";
import { paginationSchema } from "./return.schema.js";

export const equipmentListQuerySchema = paginationSchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  inStockOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  sortBy: z.enum(["name_asc", "price_asc", "price_desc", "stock_desc"]).optional(),
});

export const equipmentSchema = z.object({
  name: z.string().min(1, "Please enter a valid equipment name!"),
  description: z.string().optional(),
  quantity: z
    .number()
    .int()
    .min(0, "Quantity should be at least 0!")
    .optional()
    .default(0),
  price: z.number().min(0, "Price should be at least 0!"),
  imageUrl: z.string().optional(),
  categoryId: z.number(),
});
