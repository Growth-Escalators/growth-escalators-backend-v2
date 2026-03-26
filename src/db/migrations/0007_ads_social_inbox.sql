-- Phase: Meta Ads + Social + Inbox migrations
-- Add meta_ad_account_id to billing_clients
ALTER TABLE "billing_clients" ADD COLUMN IF NOT EXISTS "meta_ad_account_id" text;
--> statement-breakpoint
-- Add messageType and mediaUrl to messages
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "message_type" text DEFAULT 'text';
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_url" text;
--> statement-breakpoint
-- Create social_accounts table
CREATE TABLE IF NOT EXISTS "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"access_token" text NOT NULL,
	"thumbnail_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- Create social_posts table
CREATE TABLE IF NOT EXISTS "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"social_account_id" uuid NOT NULL,
	"platform" text,
	"content" text NOT NULL,
	"media_urls" text[],
	"scheduled_at" timestamp,
	"status" text DEFAULT 'draft',
	"published_at" timestamp,
	"external_post_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE no action ON UPDATE no action;
