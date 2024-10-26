/*
  Warnings:

  - A unique constraint covering the columns `[id,manual_id]` on the table `manual_steps` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "manual_steps_id_manual_id_key" ON "manual_steps"("id", "manual_id");
