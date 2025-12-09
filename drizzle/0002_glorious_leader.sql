CREATE TABLE "blackout_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blackout_dates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"company" text NOT NULL,
	"sale_owner" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text NOT NULL,
	"room_type" text NOT NULL,
	"number_of_rooms" integer NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"hold_expiry" timestamp,
	"documents" jsonb,
	"cancel_reason" text,
	"cancel_documents" jsonb,
	"cancelled_at" timestamp,
	"cancelled_by" text,
	"last_amended_at" timestamp,
	"last_amended_by" text,
	"amendment_logs" jsonb,
	"notes" text,
	CONSTRAINT "bookings_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "minimum_stay_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"min_nights" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"total_rooms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_owners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_owners_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "booking_id_idx" ON "bookings" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "check_in_idx" ON "bookings" USING btree ("check_in");--> statement-breakpoint
CREATE INDEX "check_out_idx" ON "bookings" USING btree ("check_out");--> statement-breakpoint
CREATE INDEX "room_type_idx" ON "bookings" USING btree ("room_type");