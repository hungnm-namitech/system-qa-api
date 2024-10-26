-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('WAITING', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAIL');

-- CreateTable
CREATE TABLE "manuals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "visibility_status" "VisibilityStatus" NOT NULL DEFAULT 'PRIVATE',
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'WAITING',
    "video_path" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "manuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_steps" (
    "id" UUID NOT NULL,
    "manual_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "instruction" TEXT,
    "image_path" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "manual_steps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "manuals" ADD CONSTRAINT "manuals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manuals" ADD CONSTRAINT "manuals_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_steps" ADD CONSTRAINT "manual_steps_manual_id_fkey" FOREIGN KEY ("manual_id") REFERENCES "manuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
