ALTER TABLE "rental_booking_items" ADD COLUMN "return_requested_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "rental_booking_items" ADD COLUMN "returned_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "rental_booking_items" ADD COLUMN "condition" text;--> statement-breakpoint
ALTER TABLE "rental_booking_items" ADD COLUMN "damage_fee" double precision;--> statement-breakpoint
CREATE INDEX "rental_booking_items_return_requested_idx" ON "rental_booking_items" ("return_requested_at");