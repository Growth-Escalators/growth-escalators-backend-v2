CREATE TABLE "wizmatch_source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"requirement_id" uuid,
	"company_id" uuid,
	"query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor_before" text,
	"cursor_after" text,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"inserted_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"quota_consumed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"requested_by" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wizmatch_requirements" ADD COLUMN "source_job_signal_id" uuid;--> statement-breakpoint
ALTER TABLE "wizmatch_task_links" ADD COLUMN "job_signal_id" uuid;--> statement-breakpoint
ALTER TABLE "wizmatch_source_runs" ADD CONSTRAINT "wizmatch_source_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_source_runs" ADD CONSTRAINT "wizmatch_source_runs_requirement_id_wizmatch_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."wizmatch_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_source_runs" ADD CONSTRAINT "wizmatch_source_runs_company_id_wizmatch_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."wizmatch_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_source_runs" ADD CONSTRAINT "wizmatch_source_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wizmatch_source_runs_tenant_created_idx" ON "wizmatch_source_runs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "wizmatch_source_runs_tenant_provider_idx" ON "wizmatch_source_runs" USING btree ("tenant_id","provider","created_at");--> statement-breakpoint
CREATE INDEX "wizmatch_source_runs_requirement_idx" ON "wizmatch_source_runs" USING btree ("tenant_id","requirement_id");--> statement-breakpoint
ALTER TABLE "wizmatch_requirements" ADD CONSTRAINT "wizmatch_requirements_source_job_signal_id_wizmatch_job_signals_id_fk" FOREIGN KEY ("source_job_signal_id") REFERENCES "public"."wizmatch_job_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizmatch_task_links" ADD CONSTRAINT "wizmatch_task_links_job_signal_id_wizmatch_job_signals_id_fk" FOREIGN KEY ("job_signal_id") REFERENCES "public"."wizmatch_job_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wizmatch_task_links_job_signal_idx" ON "wizmatch_task_links" USING btree ("tenant_id","job_signal_id");