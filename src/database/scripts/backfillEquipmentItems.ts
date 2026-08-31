import "dotenv/config";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import db from "../db-connection.js";
import { equipment } from "../schema/schema.js";
import * as equipmentItemRepository from "../repository/equipmentItem.repository.js";

export const placeholderSerial = (
  equipmentName: string,
  equipmentId: number,
  n: number,
): string => {
  const slug = equipmentName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return `${slug || "ITEM"}-${equipmentId}-${String(n).padStart(3, "0")}`;
};

/**
 * Backfills placeholder equipment_item rows for one equipment row, based on
 * its current `quantity`. Skips equipment that already has item rows, so
 * this is safe to re-run. Placeholder serials (e.g. DRILL-3-001) are meant
 * to be replaced with real asset tags/serial numbers once printed.
 */
export const backfillItemsForEquipment = async (equipmentRow: {
  id: number;
  name: string;
  quantity: number;
}) => {
  const existing = await equipmentItemRepository.getEquipmentItemsByEquipmentId(equipmentRow.id);
  if (existing.length > 0) {
    return { equipmentId: equipmentRow.id, created: 0, skipped: true as const };
  }

  if (equipmentRow.quantity <= 0) {
    return { equipmentId: equipmentRow.id, created: 0, skipped: false as const };
  }

  const items = Array.from({ length: equipmentRow.quantity }, (_, i) => ({
    equipmentId: equipmentRow.id,
    serialNumber: placeholderSerial(equipmentRow.name, equipmentRow.id, i + 1),
    status: "available" as const,
  }));

  const created = await equipmentItemRepository.bulkCreateEquipmentItems(items);
  return { equipmentId: equipmentRow.id, created: created.length, skipped: false as const };
};

async function main() {
  console.log("Backfilling equipment_item placeholder rows from equipment.quantity...");
  const allEquipment = await db.select().from(equipment).where(eq(equipment.isDeleted, false));

  let totalCreated = 0;
  for (const row of allEquipment) {
    const result = await backfillItemsForEquipment(row);
    if (result.skipped) {
      console.log(`  - #${row.id} ${row.name}: already has items, skipped`);
    } else {
      console.log(`  - #${row.id} ${row.name}: created ${result.created} item(s)`);
      totalCreated += result.created;
    }
  }

  console.log(`Done. Created ${totalCreated} equipment_item row(s) total.`);
  process.exit(0);
}

// Only auto-run when this file is executed directly, not when imported (e.g. by the seed script).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
