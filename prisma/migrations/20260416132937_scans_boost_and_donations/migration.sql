-- AlterTable
ALTER TABLE "Manga" ADD COLUMN "boostExpiresAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "externalDonationUrl" TEXT;
