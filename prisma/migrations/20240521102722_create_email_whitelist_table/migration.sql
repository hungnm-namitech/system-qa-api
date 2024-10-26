-- CreateTable
CREATE TABLE "email_whitelist" (
    "email" TEXT NOT NULL,

    CONSTRAINT "email_whitelist_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_whitelist_email_key" ON "email_whitelist"("email");
