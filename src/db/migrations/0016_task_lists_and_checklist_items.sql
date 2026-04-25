-- 0016: Task lists (MS To-Do-style) + per-task checklist subitems
--
-- Why: the Tasks page sidebar is being rebuilt as a To-Do workspace where users
-- create their own lists ("Marketing", "Sales", "Personal", …) and add checklist
-- subitems under any task. Both additive — existing tasks stay unaffected.

CREATE TABLE IF NOT EXISTS "task_lists" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  uuid NOT NULL REFERENCES "tenants"("id"),
  "owner_id"   uuid NOT NULL,
  "name"       text NOT NULL,
  "position"   integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "task_lists_tenant_owner_idx"
  ON "task_lists" ("tenant_id", "owner_id");

CREATE TABLE IF NOT EXISTS "task_checklist_items" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"    uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "label"      text NOT NULL,
  "is_done"    boolean DEFAULT false,
  "position"   integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "task_checklist_items_task_idx"
  ON "task_checklist_items" ("task_id");

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "list_id" uuid;
