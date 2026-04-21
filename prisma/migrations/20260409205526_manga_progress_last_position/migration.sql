-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MangaProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "lastChapterId" TEXT,
    "lastPageNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MangaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MangaProgress_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MangaProgress_lastChapterId_fkey" FOREIGN KEY ("lastChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MangaProgress" ("createdAt", "id", "mangaId", "status", "updatedAt", "userId") SELECT "createdAt", "id", "mangaId", "status", "updatedAt", "userId" FROM "MangaProgress";
DROP TABLE "MangaProgress";
ALTER TABLE "new_MangaProgress" RENAME TO "MangaProgress";
CREATE UNIQUE INDEX "MangaProgress_userId_mangaId_key" ON "MangaProgress"("userId", "mangaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
