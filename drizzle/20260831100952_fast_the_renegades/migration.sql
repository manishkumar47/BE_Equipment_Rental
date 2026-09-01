CREATE TABLE "rental_booking_items" (
	"id" serial PRIMARY KEY,
	"rental_booking_id" integer NOT NULL,
	"equipment_item_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fines" ADD COLUMN "due_date" timestamp(3);--> statement-breakpoint
ALTER TABLE "rental_bookings" ALTER COLUMN "status" SET DEFAULT 'requested'::"booking_status";--> statement-breakpoint
CREATE INDEX "rental_booking_items_booking_id_idx" ON "rental_booking_items" ("rental_booking_id");--> statement-breakpoint
CREATE INDEX "rental_booking_items_equipment_item_id_idx" ON "rental_booking_items" ("equipment_item_id");--> statement-breakpoint
ALTER TABLE "rental_booking_items" ADD CONSTRAINT "rental_booking_items_rental_booking_id_rental_bookings_id_fkey" FOREIGN KEY ("rental_booking_id") REFERENCES "rental_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "rental_booking_items" ADD CONSTRAINT "rental_booking_items_equipment_item_id_equipment_items_id_fkey" FOREIGN KEY ("equipment_item_id") REFERENCES "equipment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;