ALTER TYPE "booking_status" ADD VALUE 'requested' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "booking_status" ADD VALUE 'rejected' BEFORE 'active';
