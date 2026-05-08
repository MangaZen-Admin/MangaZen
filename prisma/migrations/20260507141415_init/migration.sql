/*
  Warnings:

  - Added the required column `country` to the `Manga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publisher` to the `Manga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `releaseYear` to the `Manga` table without a default value. This is not possible if the table is not empty.
  - Made the column `author` on table `Manga` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `Manga` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "StoreItemCategory" AS ENUM ('AVATAR_FRAME', 'NAME_COLOR', 'USER_TITLE', 'PROFILE_THEME', 'BADGE_COSMETIC');

-- CreateEnum
CREATE TYPE "StoreItemRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "StoreItemPersistence" AS ENUM ('PERMANENT', 'SUBSCRIPTION', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChangeRequestType" AS ENUM ('MANGA_EDIT', 'CHAPTER_EDIT');

-- CreateEnum
CREATE TYPE "MangaReportReason" AS ENUM ('WRONG_INFO', 'WRONG_COVER', 'DUPLICATE', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "MangaReportStatus" AS ENUM ('PENDING', 'REVIEWED');

-- CreateEnum
CREATE TYPE "EmailVerificationType" AS ENUM ('PASSWORD_RESET', 'SECURITY_CODE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CHANGE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CHANGE_REQUEST_REJECTED';

-- AlterTable
ALTER TABLE "Manga" ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "publisher" TEXT NOT NULL,
ADD COLUMN     "releaseYear" INTEGER NOT NULL,
ALTER COLUMN "author" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "isSingleInDoublePage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "isTrusted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proPlan" TEXT;

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "StoreItemCategory" NOT NULL,
    "rarity" "StoreItemRarity" NOT NULL DEFAULT 'COMMON',
    "persistence" "StoreItemPersistence" NOT NULL DEFAULT 'PERMANENT',
    "priceShards" INTEGER,
    "priceCoins" INTEGER,
    "assetUrl" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaAlternativeTitle" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "MangaAlternativeTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "type" "ChangeRequestType" NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "entityId" TEXT NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "requesterId" TEXT NOT NULL,
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaReport" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "MangaReportReason" NOT NULL,
    "details" TEXT,
    "status" "MangaReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MangaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "type" "EmailVerificationType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreItem_category_isActive_idx" ON "StoreItem"("category", "isActive");

-- CreateIndex
CREATE INDEX "StoreItem_rarity_isActive_idx" ON "StoreItem"("rarity", "isActive");

-- CreateIndex
CREATE INDEX "UserInventory_userId_isEquipped_idx" ON "UserInventory"("userId", "isEquipped");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_itemId_key" ON "UserInventory"("userId", "itemId");

-- CreateIndex
CREATE INDEX "MangaAlternativeTitle_mangaId_idx" ON "MangaAlternativeTitle"("mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaAlternativeTitle_mangaId_locale_key" ON "MangaAlternativeTitle"("mangaId", "locale");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_createdAt_idx" ON "ChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeRequest_requesterId_idx" ON "ChangeRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ChangeRequest_entityId_idx" ON "ChangeRequest"("entityId");

-- CreateIndex
CREATE INDEX "MangaReport_mangaId_status_idx" ON "MangaReport"("mangaId", "status");

-- CreateIndex
CREATE INDEX "MangaReport_status_createdAt_idx" ON "MangaReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MangaReport_mangaId_userId_key" ON "MangaReport"("mangaId", "userId");

-- CreateIndex
CREATE INDEX "EmailVerification_userId_type_idx" ON "EmailVerification"("userId", "type");

-- CreateIndex
CREATE INDEX "EmailVerification_email_type_idx" ON "EmailVerification"("email", "type");

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StoreItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaAlternativeTitle" ADD CONSTRAINT "MangaAlternativeTitle_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaReport" ADD CONSTRAINT "MangaReport_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaReport" ADD CONSTRAINT "MangaReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
