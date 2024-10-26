/*
  Warnings:

  - A unique constraint covering the columns `[email,organization_id]` on the table `invitations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_organization_id_key" ON "invitations"("email", "organization_id");
