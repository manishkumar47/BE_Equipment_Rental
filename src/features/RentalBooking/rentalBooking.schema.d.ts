import z from "zod";
export declare const rentalBookingSchema: z.ZodObject<{
    rentFrom: z.z.ZodCoercedDate<unknown>;
    rentTo: z.z.ZodCoercedDate<unknown>;
    quantity: z.ZodNumber;
    equipmentId: z.ZodNumber;
}, z.z.core.$strip>;
//# sourceMappingURL=rentalBooking.schema.d.ts.map