-- CreateTable
CREATE TABLE "MangaDescriptionTranslation" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "MangaDescriptionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MangaDescriptionTranslation_mangaId_idx" ON "MangaDescriptionTranslation"("mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaDescriptionTranslation_mangaId_locale_key" ON "MangaDescriptionTranslation"("mangaId", "locale");

-- AddForeignKey
ALTER TABLE "MangaDescriptionTranslation" ADD CONSTRAINT "MangaDescriptionTranslation_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
