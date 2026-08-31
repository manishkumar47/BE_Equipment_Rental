import {
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  uniqueIndex,
  index,
  jsonb
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const role = pgEnum("role", ["USER", "ADMIN"]);

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").default(0).notNull(),
  price: doublePrecision("price").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { precision: 3 })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  deletedAt: timestamp("deleted_at", { precision: 3 }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  equipmentCategoryId: integer("equipment_category_id")
    .notNull()
    .references(() => equipmentCategory.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
});

export const equipmentItemStatus = pgEnum("equipment_item_status", [
  "available",
  "rented",
  "under_repair",
  "damaged",
  "lost",
  "retired",
]);

export const equipmentItem = pgTable(
  "equipment_items",
  {
    id: serial("id").primaryKey(),
    equipmentId: integer("equipment_id")
      .notNull()
      .references(() => equipment.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    serialNumber: text("serial_number").notNull(),
    status: equipmentItemStatus("status").default("available").notNull(),
    conditionNotes: text("condition_notes"),
    createdAt: timestamp("created_at", { precision: 3 })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp("deleted_at", { precision: 3 }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("equipment_items_serial_number_key").on(table.serialNumber),
    index("equipment_items_equipment_id_idx").on(table.equipmentId),
    index("equipment_items_status_idx").on(table.status, table.isDeleted),
  ],
);

export const user = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    createdAt: timestamp("created_at", { precision: 3 })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    role: role("role").default("USER").notNull(),
    deletedAt: timestamp("deleted_at", { precision: 3 }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("users_email_key").on(table.email),
    index("users_is_deleted_idx").on(table.isDeleted),
  ],
);

export const passwordReset = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    expiryAt: timestamp("expiry_at", { precision: 3 }).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    used: boolean("used").default(false).notNull(),
  },
  (table) => [
    index("password_resets_token_idx").on(table.token),
    index("password_resets_user_id_idx").on(table.userId),
  ],
);

export const bookingStatus = pgEnum("booking_status", [
  "active",
  "return_requested",
  "returned",
]);

export const rentalBooking = pgTable(
  "rental_bookings",
  {
    id: serial("id").primaryKey(),
    rentFrom: timestamp("rent_from", { precision: 3 }).notNull(),
    rentTo: timestamp("rent_to", { precision: 3 }).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    equipmentId: integer("equipment_id")
      .notNull()
      .references(() => equipment.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    quantity: integer("quantity").notNull(),
    status: bookingStatus("status").default("active").notNull(),
    returnRequestedAt: timestamp("return_requested_at", { precision: 3 }),
    returnedAt: timestamp("returned_at", { precision: 3 }),
    returnCondition: text("return_condition"), // 'good' | 'damaged' | 'lost'
    conditionNotes: text("condition_notes"),
    rejectionReason: text("rejection_reason"), // set when admin rejects return request
    deletedAt: timestamp("deleted_at", { precision: 3 }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    isReminderSent: boolean("is_reminder_sent").default(false).notNull(),
  },
  (table) => [
    index("rental_bookings_user_id_idx").on(table.userId),
    index("rental_bookings_equipment_id_idx").on(table.equipmentId),
    index("rental_bookings_status_idx").on(table.status, table.isDeleted),
    index("rental_bookings_reminder_idx").on(
      table.isReminderSent,
      table.isDeleted,
      table.rentFrom,
      table.rentTo,
    ),
  ],
);
export const equipmentCategory = pgTable("equipment_category", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { precision: 3 })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const otpVerification = pgTable(
  "otp_verifications",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    otpHash: text("otp_hash").notNull(),
    payload: jsonb("payload"),
    expiresAt: timestamp("expires_at", { precision: 3 }).notNull(),
    used: boolean("used").default(false).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { precision: 3 })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("otp_verifications_email_idx").on(table.email, table.used),
  ],
);

export const fineStatus = pgEnum("fine_status", ["unpaid", "paid", "waived"]);

export const fine = pgTable(
  "fines",
  {
    id: serial("id").primaryKey(),
    rentalBookingId: integer("rental_booking_id")
      .notNull()
      .references(() => rentalBooking.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    amount: doublePrecision("amount").notNull(),
    daysLate: integer("days_late").default(0).notNull(),
    reason: text("reason"), // e.g. 'late_return' | 'damaged' | 'lost' — free text or tie to returnCondition
    status: fineStatus("status").default("unpaid").notNull(),
    createdAt: timestamp("created_at", { precision: 3 })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    resolvedAt: timestamp("resolved_at", { precision: 3 }), // when marked paid/waived
  },
  (table) => [
    index("fines_user_id_idx").on(table.userId),
    index("fines_rental_booking_id_idx").on(table.rentalBookingId),
    index("fines_status_idx").on(table.status),
  ],
);