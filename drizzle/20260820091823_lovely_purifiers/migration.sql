CREATE TABLE "equipment_category" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "equipment_category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_equipment_category_id_equipment_category_id_fkey" FOREIGN KEY ("equipment_category_id") REFERENCES "equipment_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;