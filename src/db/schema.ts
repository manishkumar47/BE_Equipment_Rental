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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const role = pgEnum("role", ["USER", "ADMIN"]);

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").default(0).notNull(),
  price: doublePrecision("price").notNull(),
  createdAt: timestamp("created_at", { precision: 3 })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  deletedAt: timestamp("deleted_at", { precision: 3 }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

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
    deletedAt: timestamp("deleted_at", { precision: 3 }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    isReminderSent: boolean("is_reminder_sent").default(false).notNull(),
  },
  (table) => [
    index("rental_bookings_user_id_idx").on(table.userId),
    index("rental_bookings_equipment_id_idx").on(table.equipmentId),
    index("rental_bookings_reminder_idx").on(
      table.isReminderSent,
      table.isDeleted,
      table.rentFrom,
      table.rentTo,
    ),
  ],
);
