import * as schema from "../src/db/schema.js";
export declare const relations: import("drizzle-orm").ExtractTablesWithRelations<{
    user: {
        rentalBookings: import("drizzle-orm").Many<"rentalBooking">;
        passwordResets: import("drizzle-orm").Many<"passwordReset">;
    };
    equipment: {
        rentalBookings: import("drizzle-orm").Many<"rentalBooking">;
    };
    rentalBooking: {
        user: import("drizzle-orm").One<"user", true>;
        equipment: import("drizzle-orm").One<"equipment", true>;
    };
    passwordReset: {
        user: import("drizzle-orm").One<"user", true>;
    };
}, import("drizzle-orm").ExtractTablesFromSchema<typeof schema>>;
//# sourceMappingURL=relations.d.ts.map