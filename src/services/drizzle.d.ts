import "dotenv/config";
declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<import("drizzle-orm").ExtractTablesWithRelations<{
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
}, import("drizzle-orm").ExtractTablesFromSchema<typeof import("../db/schema.js")>>> & {
    $client: import("pg").Pool;
};
export default db;
//# sourceMappingURL=drizzle.d.ts.map