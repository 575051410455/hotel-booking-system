ALTER TABLE "room_types" ALTER COLUMN "total_rooms" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "base_rate" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "amenities" jsonb;--> statement-breakpoint
ALTER TABLE "room_types" DROP COLUMN "name_en";--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_name_unique" UNIQUE("name");