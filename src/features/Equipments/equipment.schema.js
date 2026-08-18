import z from "zod";
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
});
//# sourceMappingURL=equipment.schema.js.map