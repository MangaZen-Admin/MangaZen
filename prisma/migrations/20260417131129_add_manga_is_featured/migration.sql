-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Manga" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "alternativeTitle" TEXT,
    "author" TEXT,
    "artist" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "bannerImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "type" TEXT NOT NULL DEFAULT 'MANGA',
    "demographic" TEXT,
    "contentRating" TEXT NOT NULL DEFAULT 'EVERYONE',
    "isWebcomic" BOOLEAN NOT NULL DEFAULT false,
    "isYonkoma" BOOLEAN NOT NULL DEFAULT false,
    "isAmateur" BOOLEAN NOT NULL DEFAULT false,
    "scoreAvg" REAL NOT NULL DEFAULT 0,
    "scoreCount" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "reviewRejectionReason" TEXT,
    "boostExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "uploaderId" TEXT NOT NULL,
    CONSTRAINT "Manga_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Manga" ("alternativeTitle", "artist", "author", "bannerImage", "boostExpiresAt", "contentRating", "coverImage", "createdAt", "demographic", "description", "id", "isAmateur", "isWebcomic", "isYonkoma", "reviewRejectionReason", "reviewStatus", "scoreAvg", "scoreCount", "slug", "status", "title", "type", "updatedAt", "uploaderId") SELECT "alternativeTitle", "artist", "author", "bannerImage", "boostExpiresAt", "contentRating", "coverImage", "createdAt", "demographic", "description", "id", "isAmateur", "isWebcomic", "isYonkoma", "reviewRejectionReason", "reviewStatus", "scoreAvg", "scoreCount", "slug", "status", "title", "type", "updatedAt", "uploaderId" FROM "Manga";
DROP TABLE "Manga";
ALTER TABLE "new_Manga" RENAME TO "Manga";
CREATE UNIQUE INDEX "Manga_slug_key" ON "Manga"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
