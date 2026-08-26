CREATE TYPE "booking_status" AS ENUM('active', 'return_requested', 'returned');--> statement-breakpoint
ALTER TABLE "rental_bookings" ADD COLUMN "status" "booking_status" DEFAULT 'active'::"booking_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_bookings" ADD COLUMN "return_requested_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "rental_bookings" ADD COLUMN "returned_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "rental_bookings" ADD COLUMN "return_condition" text;--> statement-breakpoint
ALTER TABLE "rental_bookings" ADD COLUMN "condition_notes" text;--> statement-breakpoint
ALTER TABLE "rental_bookings" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
CREATE INDEX "rental_bookings_status_idx" ON "rental_bookings" ("status","is_deleted");