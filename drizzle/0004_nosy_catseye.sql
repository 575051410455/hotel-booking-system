ALTER TABLE "companies" DROP CONSTRAINT "companies_name_unique";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "contact_person" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "credit_terms" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;