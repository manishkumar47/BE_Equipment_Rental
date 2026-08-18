import z from "zod";
export declare const equipmentSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    price: z.ZodNumber;
}, z.z.core.$strip>;
//# sourceMappingURL=equipment.schema.d.ts.map