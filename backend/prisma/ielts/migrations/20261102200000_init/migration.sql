-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('ACADEMIC', 'GENERAL_TRAINING');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "ExamModule" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "eduportal_session_id" TEXT NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_assertions" (
    "jti" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_assertions_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "ielts_tests" (
    "id" TEXT NOT NULL,
    "academy_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "test_type" "TestType" NOT NULL,
    "schema_version" VARCHAR(16) NOT NULL,
    "candidate" JSONB NOT NULL,
    "answer_key" JSONB NOT NULL,
    "staff" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "package_sha256" CHAR(64) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ielts_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_assets" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(8) NOT NULL,
    "mime_type" VARCHAR(40) NOT NULL,
    "file_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "duration_seconds" DOUBLE PRECISION,
    "alt" TEXT,

    CONSTRAINT "test_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "academy_id" UUID NOT NULL,
    "campus_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "class_title" VARCHAR(200) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "results_released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "current_module" "ExamModule",
    "module_started_at" TIMESTAMP(3),
    "module_deadline" TIMESTAMP(3),
    "module_times" JSONB NOT NULL DEFAULT '{}',
    "listening_answers" JSONB NOT NULL DEFAULT '{}',
    "reading_answers" JSONB NOT NULL DEFAULT '{}',
    "writing_task1" TEXT NOT NULL DEFAULT '',
    "writing_task2" TEXT NOT NULL DEFAULT '',
    "listening_raw" INTEGER,
    "listening_band" DOUBLE PRECISION,
    "listening_marks" JSONB,
    "reading_raw" INTEGER,
    "reading_band" DOUBLE PRECISION,
    "reading_marks" JSONB,
    "writing_scores" JSONB,
    "writing_band" DOUBLE PRECISION,
    "speaking_scores" JSONB,
    "speaking_band" DOUBLE PRECISION,
    "overall_band" DOUBLE PRECISION,
    "graded_by_id" UUID,
    "graded_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaking_recordings" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "part" SMALLINT NOT NULL,
    "index" SMALLINT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" VARCHAR(40) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speaking_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sso_assertions_expires_at_idx" ON "sso_assertions"("expires_at");

-- CreateIndex
CREATE INDEX "ielts_tests_academy_id_archived_at_idx" ON "ielts_tests"("academy_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "test_assets_test_id_key_key" ON "test_assets"("test_id", "key");

-- CreateIndex
CREATE INDEX "assignments_class_id_closes_at_idx" ON "assignments"("class_id", "closes_at");

-- CreateIndex
CREATE INDEX "assignments_test_id_idx" ON "assignments"("test_id");

-- CreateIndex
CREATE INDEX "attempts_user_id_idx" ON "attempts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_assignment_id_user_id_key" ON "attempts"("assignment_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "speaking_recordings_attempt_id_part_index_key" ON "speaking_recordings"("attempt_id", "part", "index");

-- AddForeignKey
ALTER TABLE "test_assets" ADD CONSTRAINT "test_assets_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "ielts_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "ielts_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_recordings" ADD CONSTRAINT "speaking_recordings_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

