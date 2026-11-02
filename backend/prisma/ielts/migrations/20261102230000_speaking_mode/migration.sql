-- Speaking face to face with the teacher (online sitting ends after Writing)
CREATE TYPE "SpeakingMode" AS ENUM ('RECORDED', 'FACE_TO_FACE');
ALTER TABLE "assignments" ADD COLUMN "speaking_mode" "SpeakingMode" NOT NULL DEFAULT 'RECORDED';

-- Duplicate package check on import
CREATE INDEX "ielts_tests_academy_id_package_sha256_idx" ON "ielts_tests"("academy_id", "package_sha256");
