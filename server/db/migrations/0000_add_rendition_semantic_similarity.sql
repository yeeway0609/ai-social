ALTER TABLE "renditions" ADD COLUMN IF NOT EXISTS "semantic_similarity_score" real;
ALTER TABLE "renditions" ADD COLUMN IF NOT EXISTS "semantic_similarity_model" text;
ALTER TABLE "renditions" ADD COLUMN IF NOT EXISTS "semantic_similarity_version" text;
ALTER TABLE "renditions" ADD COLUMN IF NOT EXISTS "semantic_similarity_error" text;
