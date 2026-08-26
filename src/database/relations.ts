import { defineRelations } from "drizzle-orm";
import * as schema from "../database/schema/schema.js";

export const relations = defineRelations(schema, (r) => ({
  // 1. USER relationships
  user: {
    rentalBookings: r.many.rentalBooking(),
    passwordResets: r.many.passwordReset(),
    fines: r.many.fine(),
  },

  // 2. EQUIPMENT relationships
  equipment: {
    rentalBookings: r.many.rentalBooking(),
    equipmentCategory: r.one.equipmentCategory({
      from: r.equipment.equipmentCategoryId,
      to: r.equipmentCategory.id,
    }),
  },

  // 3. RENTAL BOOKING relationships
  rentalBooking: {
    user: r.one.user({
      from: r.rentalBooking.userId,
      to: r.user.id,
    }),
    equipment: r.one.equipment({
      from: r.rentalBooking.equipmentId,
      to: r.equipment.id,
    }),
    fines: r.many.fine(),
  },

  // 4. PASSWORD RESET relationships
  passwordReset: {
    user: r.one.user({
      from: r.passwordReset.userId,
      to: r.user.id,
    }),
  },

  // 5. EQUIPMENT CATEGORY relationships
  equipmentCategory: {
    equipments: r.many.equipment(),
  },

  // 6. FINE relationships
  fine: {
    rentalBooking: r.one.rentalBooking({
      from: r.fine.rentalBookingId,
      to: r.rentalBooking.id,
    }),
    user: r.one.user({
      from: r.fine.userId,
      to: r.user.id,
    }),
  },
}));
