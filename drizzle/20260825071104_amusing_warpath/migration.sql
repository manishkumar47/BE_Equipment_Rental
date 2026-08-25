CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL,
	"otp_hash" text NOT NULL,
	"payload" jsonb,
	"expires_at" timestamp(3) NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "otp_verifications_email_idx" ON "otp_verifications" ("email","used");