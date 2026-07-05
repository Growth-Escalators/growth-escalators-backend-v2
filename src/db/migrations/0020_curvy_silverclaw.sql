CREATE TABLE "wizmatch_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"raw_jd" text,
	"required_skills" text[] DEFAULT '{}',
	"nice_to_have_skills" text[] DEFAULT '{}',
	"min_experience" integer,
	"max_experience" integer,
	"location" text,
	"work_mode" text,
	"employment_type" text,
	"region" text DEFAULT 'india',
	"budget_min" integer,
	"budget_max" integer,
	"budget_currency" text DEFAULT 'INR',
	"budget_period" text DEFAULT 'monthly',
	"positions" integer DEFAULT 1,
	"priority" text DEFAULT 'normal',
	"mask_client" boolean DEFAULT true,
	"source_file_url" text,
	"sheet_url" text,
	"vendor_notes" text,
	"status" text DEFAULT 'draft',
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "wizmatch_requirements" ADD CONSTRAINT "wizmatch_requirements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_requirements" ADD CONSTRAINT "wizmatch_requirements_company_id_wizmatch_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."wizmatch_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_requirements" ADD CONSTRAINT "wizmatch_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wizmatch_requirements_tenant_status_idx" ON "wizmatch_requirements" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "wizmatch_requirements_company_idx" ON "wizmatch_requirements" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "wizmatch_requirements_region_idx" ON "wizmatch_requirements" USING btree ("region");