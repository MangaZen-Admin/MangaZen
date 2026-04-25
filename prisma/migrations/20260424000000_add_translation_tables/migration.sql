-- CreateTable
CREATE TABLE IF NOT EXISTS "AnnouncementTranslation" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "AnnouncementTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GlobalBannerTranslation" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "GlobalBannerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementTranslation_announcementId_locale_key"
ON "AnnouncementTranslation"("announcementId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GlobalBannerTranslation_bannerId_locale_key"
ON "GlobalBannerTranslation"("bannerId", "locale");

-- AddForeignKey
ALTER TABLE "AnnouncementTranslation"
ADD CONSTRAINT "AnnouncementTranslation_announcementId_fkey"
FOREIGN KEY ("announcementId")
REFERENCES "Announcement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalBannerTranslation"
ADD CONSTRAINT "GlobalBannerTranslation_bannerId_fkey"
FOREIGN KEY ("bannerId")
REFERENCES "GlobalBanner"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- RemoveOldColumns (si existen)
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "title";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "body";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "GlobalBanner" DROP COLUMN IF EXISTS "message";
