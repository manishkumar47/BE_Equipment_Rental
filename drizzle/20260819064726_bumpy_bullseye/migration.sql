CREATE INDEX "password_resets_token_idx" ON "password_resets" ("token");--> statement-breakpoint
CREATE INDEX "password_resets_user_id_idx" ON "password_resets" ("user_id");--> statement-breakpoint
CREATE INDEX "rental_bookings_user_id_idx" ON "rental_bookings" ("user_id");--> statement-breakpoint
CREATE INDEX "rental_bookings_equipment_id_idx" ON "rental_bookings" ("equipment_id");--> statement-breakpoint
CREATE INDEX "rental_bookings_reminder_idx" ON "rental_bookings" ("is_reminder_sent","is_deleted","rent_from","rent_to");--> statement-breakpoint
CREATE INDEX "users_is_deleted_idx" ON "users" ("is_deleted");