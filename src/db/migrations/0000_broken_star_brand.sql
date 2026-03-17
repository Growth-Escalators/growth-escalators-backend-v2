CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"cal_booking_uid" text NOT NULL,
	"status" text DEFAULT 'confirmed',
	"scheduled_at" timestamp NOT NULL,
	"qualification_answers" jsonb DEFAULT '{}'::jsonb,
	"qualification_score" integer DEFAULT 0,
	"qualification_tier" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bookings_cal_booking_uid_unique" UNIQUE("cal_booking_uid")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"retainer_amount" numeric(12, 2) DEFAULT '0',
	"performance_fee_pct" numeric(5, 2) DEFAULT '0',
	"revenue_threshold" numeric(12, 2),
	"services" text[] DEFAULT '{}',
	"onboarding_status" text DEFAULT 'pending',
	"reporting_day" integer DEFAULT 1,
	"started_at" date,
	"ended_at" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"channel_type" text NOT NULL,
	"channel_value" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"verified" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"score" integer DEFAULT 0,
	"status" text DEFAULT 'lead',
	"source" text,
	"source_detail" text,
	"assigned_to" text,
	"tags" text[] DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"opted_in_wa" boolean DEFAULT false,
	"opted_in_email" boolean DEFAULT false,
	"do_not_contact" boolean DEFAULT false,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"title" text NOT NULL,
	"stage" text DEFAULT 'lead',
	"value" numeric(12, 2),
	"service_type" text,
	"lost_reason" text,
	"expected_close_date" date,
	"closed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"event_type" text NOT NULL,
	"channel" text,
	"direction" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"source_id" text,
	"occurred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"payload" jsonb DEFAULT '{}'::jsonb,
	"idempotency_key" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_error" text,
	"process_after" timestamp DEFAULT now(),
	"processing_started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"event_id" uuid,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"external_id" text,
	"template_name" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'sent',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"source" text NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	CONSTRAINT "processed_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "sequence_enrolments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"sequence_id" uuid NOT NULL,
	"current_step" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"next_step_at" timestamp NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" text,
	"due_at" timestamp,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'agency_internal',
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wa_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_name" text NOT NULL,
	"category" text NOT NULL,
	"language" text DEFAULT 'en',
	"variable_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending',
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_channels" ADD CONSTRAINT "contact_channels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_channels" ADD CONSTRAINT "contact_channels_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_enrolments" ADD CONSTRAINT "sequence_enrolments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_enrolments" ADD CONSTRAINT "sequence_enrolments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_enrolments" ADD CONSTRAINT "sequence_enrolments_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_templates" ADD CONSTRAINT "wa_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_tenant_id_idx" ON "clients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_channels_contact_id_idx" ON "contact_channels" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_channels_unique_idx" ON "contact_channels" USING btree ("contact_id","channel_type","channel_value");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deals_tenant_id_idx" ON "deals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deals_contact_id_idx" ON "deals" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "events_tenant_id_idx" ON "events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "events_contact_id_idx" ON "events" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "events_event_type_idx" ON "events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "events_occurred_at_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "jobs_job_type_idx" ON "jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_status_process_after_idx" ON "jobs" USING btree ("status","process_after");--> statement-breakpoint
CREATE INDEX "messages_contact_id_idx" ON "messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "seq_enrolments_contact_id_idx" ON "sequence_enrolments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "seq_enrolments_status_next_step_idx" ON "sequence_enrolments" USING btree ("status","next_step_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wa_templates_tenant_name_idx" ON "wa_templates" USING btree ("tenant_id","template_name");