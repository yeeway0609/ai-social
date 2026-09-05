ALTER TABLE "users" DROP COLUMN IF EXISTS "custom_instruction";
DROP INDEX IF EXISTS "renditions_key";
ALTER TABLE "renditions" DROP COLUMN IF EXISTS "instruction_hash";
CREATE UNIQUE INDEX IF NOT EXISTS "renditions_key" ON "renditions" ("kind", "content_id", "tone");
