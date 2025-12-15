ALTER TABLE "blackout_dates" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "minimum_stay_rules" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "minimum_stay_rules" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "sales_owners" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales_owners" ADD COLUMN "deleted_by" text;--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "bookings" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "phone_idx" ON "bookings" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "email_idx" ON "bookings" USING btree ("email");--> statement-breakpoint
CREATE INDEX "company_idx" ON "bookings" USING btree ("company");--> statement-breakpoint
CREATE INDEX "sale_owner_idx" ON "bookings" USING btree ("sale_owner");--> statement-breakpoint
CREATE INDEX "status_checkin_roomtype_idx" ON "bookings" USING btree ("status","check_in","room_type");--> statement-breakpoint
CREATE INDEX "deleted_at_idx" ON "bookings" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "hold_expiry_idx" ON "bookings" USING btree ("hold_expiry");