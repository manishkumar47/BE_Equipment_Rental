CREATE TYPE "fine_status" AS ENUM('unpaid', 'paid', 'waived');--> statement-breakpoint
CREATE TABLE "fines" (
	"id" serial PRIMARY KEY,
	"rental_booking_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"days_late" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"status" "fine_status" DEFAULT 'unpaid'::"fine_status" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resolved_at" timestamp(3)
);
--> statement-breakpoint
CREATE INDEX "fines_user_id_idx" ON "fines" ("user_id");--> statement-breakpoint
CREATE INDEX "fines_rental_booking_id_idx" ON "fines" ("rental_booking_id");--> statement-breakpoint
CREATE INDEX "fines_status_idx" ON "fines" ("status");--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_rental_booking_id_rental_bookings_id_fkey" FOREIGN KEY ("rental_booking_id") REFERENCES "rental_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;