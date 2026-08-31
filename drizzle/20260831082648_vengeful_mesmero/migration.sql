CREATE TYPE "equipment_item_status" AS ENUM('available', 'rented', 'under_repair', 'damaged', 'lost', 'retired');--> statement-breakpoint
CREATE TABLE "equipment_items" (
	"id" serial PRIMARY KEY,
	"equipment_id" integer NOT NULL,
	"serial_number" text NOT NULL,
	"status" "equipment_item_status" DEFAULT 'available'::"equipment_item_status" NOT NULL,
	"condition_notes" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp(3),
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_items_serial_number_key" ON "equipment_items" ("serial_number");--> statement-breakpoint
CREATE INDEX "equipment_items_equipment_id_idx" ON "equipment_items" ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_items_status_idx" ON "equipment_items" ("status","is_deleted");--> statement-breakpoint
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_equipment_id_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;