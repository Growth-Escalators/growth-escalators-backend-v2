-- Replace btree indexes on array columns with GIN indexes for efficient && (overlap) queries.
-- drizzle-kit emits btree by default; GIN is required for PostgreSQL array operators.
-- Matches repo precedent of hand-written index SQL (see 0001_add_missing_indexes.sql, 0004_indexes.sql).

-- Drop the btree indexes that drizzle-kit created on array columns
DROP INDEX IF EXISTS "wizmatch_candidates_skills_idx";
DROP INDEX IF EXISTS "wizmatch_job_signals_keywords_idx";

-- Create GIN indexes for array overlap queries (&& operator)
CREATE INDEX "wizmatch_candidates_skills_idx" ON "wizmatch_candidates" USING GIN ("skills");
CREATE INDEX "wizmatch_job_signals_keywords_idx" ON "wizmatch_job_signals" USING GIN ("keywords");