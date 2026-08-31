import "dotenv/config";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import db from "../db-connection.js";
import { equipment, equipmentCategory, user } from "../schema/schema.js";
import { mockCategories, mockEquipment, mockUsers } from "./mockData.js";
import { backfillItemsForEquipment } from "../scripts/backfillEquipmentItems.js";

/**
 * Seeds the TEST database branch only. Truncates all app tables first, so this
 * is destructive by design — it must never run against dev/prod.
 */
async function main() {
  if (process.env.NODE_ENV !== "test") {
    console.error(
      "Refusing to seed: NODE_ENV must be 'test' (got '%s'). Run via `npm run db:test:seed`.",
      process.env.NODE_ENV,
    );
    process.exit(1);
  }

  console.log("Seeding test database...");

  await db.execute(sql`
    TRUNCATE TABLE
      fines,
      password_resets,
      otp_verifications,
      rental_bookings,
      equipment_items,
      equipment,
      equipment_category,
      users
    RESTART IDENTITY CASCADE
  `);

  const insertedCategories = await db
    .insert(equipmentCategory)
    .values(mockCategories.map((c) => ({ name: c.name })))
    .returning({ id: equipmentCategory.id, name: equipmentCategory.name });

  const categoryIdByName = new Map(insertedCategories.map((c) => [c.name, c.id]));

  const insertedEquipment = await db
    .insert(equipment)
    .values(
      mockEquipment.map((item) => {
        const equipmentCategoryId = categoryIdByName.get(item.categoryName);
        if (!equipmentCategoryId) {
          throw new Error(`Seed error: unknown category '${item.categoryName}'`);
        }
        return {
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl,
          equipmentCategoryId,
        };
      }),
    )
    .returning({ id: equipment.id, name: equipment.name, quantity: equipment.quantity });

  let totalItemsCreated = 0;
  for (const row of insertedEquipment) {
    const result = await backfillItemsForEquipment(row);
    totalItemsCreated += result.created;
  }

  const usersToInsert = await Promise.all(
    Object.values(mockUsers).map(async (u) => ({
      name: u.name,
      email: u.email,
      password: await bcrypt.hash(u.password, 10),
      role: u.role,
    })),
  );

  await db.insert(user).values(usersToInsert);

  console.log(
    `Seeded ${insertedCategories.length} categories, ${mockEquipment.length} equipment types (${totalItemsCreated} equipment_item rows), ${usersToInsert.length} users.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
