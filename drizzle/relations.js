import { defineRelations } from "drizzle-orm";
import * as schema from "../src/db/schema.js";
export const relations = defineRelations(schema, (r) => ({
    // 1. USER relationships
    user: {
        rentalBookings: r.many.rentalBooking(),
        passwordResets: r.many.passwordReset(),
    },
    // 2. EQUIPMENT relationships
    equipment: {
        rentalBookings: r.many.rentalBooking(),
    },
    // 3. RENTAL BOOKING relationships (resolves the foreign keys)
    rentalBooking: {
        user: r.one.user({
            from: r.rentalBooking.userId,
            to: r.user.id,
        }),
        equipment: r.one.equipment({
            from: r.rentalBooking.equipmentId,
            to: r.equipment.id,
        }),
    },
    // 4. PASSWORD RESET relationships
    passwordReset: {
        user: r.one.user({
            from: r.passwordReset.userId,
            to: r.user.id,
        }),
    },
}));
//# sourceMappingURL=relations.js.map