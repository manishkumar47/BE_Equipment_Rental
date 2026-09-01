import z from "zod";

export const rentalBookingSchema = z
  .object({
    rentFrom: z.coerce.date({
      message: "Please provide a valid start date!",
    }),
    rentTo: z.coerce.date({
      message: "Please provide a valid end date!",
    }),
    quantity: z.number().int().positive("Quantity must be a positive integer!"),
    equipmentId: z
      .number()
      .int()
      .positive("Equipment ID must be a positive integer!"),
  })
  .refine((data) => data.rentTo >= data.rentFrom, {
    message: "rentTo must be greater than or equal to rentFrom!",
    path: ["rentTo"],
  })
  .refine((data) => new Date() <= data.rentFrom, {
    message: "rentFrom must be greater than or equal to current time!",
    path: ["rentFrom"],
  });

export const rejectBookingRequestSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Rejection reason is required!"),
});
