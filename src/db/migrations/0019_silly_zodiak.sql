CREATE TABLE "wizmatch_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"skills" text[] NOT NULL,
	"location" text,
	"visa_status" text,
	"rate_hourly" integer,
	"rate_currency" text DEFAULT 'USD',
	"availability_date" date,
	"availability_status" text DEFAULT 'available',
	"source" text,
	"linkedin_url" text,
	"github_url" text,
	"resume_url" text,
	"match_score" integer,
	"is_wizmatch_certified" boolean DEFAULT false,
	"india_specific" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizmatch_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"ats_type" text,
	"ats_board_url" text,
	"ats_slug" text,
	"employee_count" integer,
	"industry" text,
	"h1b_sponsor_count" integer DEFAULT 0,
	"state" text,
	"country" text DEFAULT 'US',
	"linkedin_url" text,
	"is_prime" boolean DEFAULT false,
	"prime_msa_status" text DEFAULT 'none',
	"prime_msa_signed_at" timestamp,
	"prime_contact_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizmatch_domain_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"inbox_addresses" text[] DEFAULT '{}',
	"last_check_at" timestamp,
	"spf_ok" boolean,
	"dkim_ok" boolean,
	"dmarc_ok" boolean,
	"blacklisted" boolean DEFAULT false,
	"blacklist_sources" text[] DEFAULT '{}',
	"reply_rate_7d" real DEFAULT 0,
	"bounce_rate_7d" real DEFAULT 0,
	"sends_7d" integer DEFAULT 0,
	"status" text DEFAULT 'healthy',
	"paused_reason" text,
	"paused_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizmatch_job_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid,
	"job_title" text NOT NULL,
	"job_url" text,
	"source" text NOT NULL,
	"posted_at" timestamp,
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	"days_open" integer DEFAULT 0,
	"repost_count" integer DEFAULT 0,
	"salary_range" text,
	"employment_type" text,
	"keywords" text[] DEFAULT '{}',
	"location" text,
	"raw_text" text,
	"score" integer DEFAULT 0,
	"score_breakdown" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'new',
	"contact_id" uuid,
	"company_volume_count" integer DEFAULT 0,
	"matched_candidate_ids" uuid[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizmatch_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid,
	"candidate_id" uuid,
	"job_signal_id" uuid,
	"company_id" uuid,
	"prime_company_id" uuid,
	"placement_type" text,
	"bill_rate_hourly" integer,
	"pay_rate_hourly" integer,
	"margin_hourly" integer,
	"currency" text DEFAULT 'USD',
	"contract_start_date" date,
	"contract_end_date" date,
	"contract_length_months" integer,
	"perm_fee_percentage" numeric(5, 2),
	"perm_ctc_annual" integer,
	"perm_fee_amount" integer,
	"status" text DEFAULT 'submitted',
	"rtr_document_url" text,
	"contract_document_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizmatch_suppression_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"email" text,
	"reason" text NOT NULL,
	"source_channel" text,
	"suppressed_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "wizmatch_candidates" ADD CONSTRAINT "wizmatch_candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_candidates" ADD CONSTRAINT "wizmatch_candidates_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_companies" ADD CONSTRAINT "wizmatch_companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_companies" ADD CONSTRAINT "wizmatch_companies_prime_contact_id_contacts_id_fk" FOREIGN KEY ("prime_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_domain_health" ADD CONSTRAINT "wizmatch_domain_health_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_job_signals" ADD CONSTRAINT "wizmatch_job_signals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_job_signals" ADD CONSTRAINT "wizmatch_job_signals_company_id_wizmatch_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."wizmatch_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_job_signals" ADD CONSTRAINT "wizmatch_job_signals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_placements" ADD CONSTRAINT "wizmatch_placements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_placements" ADD CONSTRAINT "wizmatch_placements_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_placements" ADD CONSTRAINT "wizmatch_placements_candidate_id_wizmatch_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."wizmatch_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_placements" ADD CONSTRAINT "wizmatch_placements_job_signal_id_wizmatch_job_signals_id_fk" FOREIGN KEY ("job_signal_id") REFERENCES "public"."wizmatch_job_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_placements" ADD CONSTRAINT "wizmatch_placements_company_id_wizmatch_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."wizmatch_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_placements" ADD CONSTRAINT "wizmatch_placements_prime_company_id_wizmatch_companies_id_fk" FOREIGN KEY ("prime_company_id") REFERENCES "public"."wizmatch_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_suppression_list" ADD CONSTRAINT "wizmatch_suppression_list_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_suppression_list" ADD CONSTRAINT "wizmatch_suppression_list_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wizmatch_candidates_tenant_idx" ON "wizmatch_candidates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wizmatch_candidates_skills_idx" ON "wizmatch_candidates" USING btree ("skills");--> statement-breakpoint
CREATE INDEX "wizmatch_candidates_availability_idx" ON "wizmatch_candidates" USING btree ("availability_status");--> statement-breakpoint
CREATE INDEX "wizmatch_candidates_visa_idx" ON "wizmatch_candidates" USING btree ("visa_status");--> statement-breakpoint
CREATE INDEX "wizmatch_candidates_source_idx" ON "wizmatch_candidates" USING btree ("source");--> statement-breakpoint
CREATE INDEX "wizmatch_companies_tenant_idx" ON "wizmatch_companies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wizmatch_companies_domain_idx" ON "wizmatch_companies" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "wizmatch_companies_prime_idx" ON "wizmatch_companies" USING btree ("is_prime");--> statement-breakpoint
CREATE UNIQUE INDEX "wizmatch_companies_tenant_name_idx" ON "wizmatch_companies" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "wizmatch_domain_health_status_idx" ON "wizmatch_domain_health" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wizmatch_domain_health_tenant_domain_idx" ON "wizmatch_domain_health" USING btree ("tenant_id","domain");--> statement-breakpoint
CREATE INDEX "wizmatch_job_signals_tenant_score_idx" ON "wizmatch_job_signals" USING btree ("tenant_id","score");--> statement-breakpoint
CREATE INDEX "wizmatch_job_signals_status_idx" ON "wizmatch_job_signals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wizmatch_job_signals_company_idx" ON "wizmatch_job_signals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "wizmatch_job_signals_keywords_idx" ON "wizmatch_job_signals" USING btree ("keywords");--> statement-breakpoint
CREATE UNIQUE INDEX "wizmatch_job_signals_tenant_job_url_idx" ON "wizmatch_job_signals" USING btree ("tenant_id","job_url");--> statement-breakpoint
CREATE INDEX "wizmatch_placements_tenant_status_idx" ON "wizmatch_placements" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "wizmatch_placements_candidate_idx" ON "wizmatch_placements" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "wizmatch_placements_company_idx" ON "wizmatch_placements" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "wizmatch_placements_prime_idx" ON "wizmatch_placements" USING btree ("prime_company_id");--> statement-breakpoint
CREATE INDEX "wizmatch_suppression_tenant_email_idx" ON "wizmatch_suppression_list" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "wizmatch_suppression_contact_idx" ON "wizmatch_suppression_list" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wizmatch_suppression_tenant_email_uniq_idx" ON "wizmatch_suppression_list" USING btree ("tenant_id","email");