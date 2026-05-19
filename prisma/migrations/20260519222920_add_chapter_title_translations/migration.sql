-- CreateTable
CREATE TABLE "ChapterTitleTranslation" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "ChapterTitleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterTitleTranslation_chapterId_idx" ON "ChapterTitleTranslation"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterTitleTranslation_chapterId_locale_key" ON "ChapterTitleTranslation"("chapterId", "locale");

-- AddForeignKey
ALTER TABLE "ChapterTitleTranslation" ADD CONSTRAINT "ChapterTitleTranslation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
