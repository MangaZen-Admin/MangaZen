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
    "reviewRejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "uploaderId" TEXT NOT NULL,
    CONSTRAINT "Manga_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Manga" ("alternativeTitle", "artist", "author", "bannerImage", "contentRating", "coverImage", "createdAt", "demographic", "description", "id", "isAmateur", "isWebcomic", "isYonkoma", "scoreAvg", "scoreCount", "slug", "status", "title", "type", "updatedAt", "uploaderId") SELECT "alternativeTitle", "artist", "author", "bannerImage", "contentRating", "coverImage", "createdAt", "demographic", "description", "id", "isAmateur", "isWebcomic", "isYonkoma", "scoreAvg", "scoreCount", "slug", "status", "title", "type", "updatedAt", "uploaderId" FROM "Manga";
DROP TABLE "Manga";
ALTER TABLE "new_Manga" RENAME TO "Manga";
CREATE UNIQUE INDEX "Manga_slug_key" ON "Manga"("slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "zenPoints" INTEGER NOT NULL DEFAULT 0,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "requirePasswordForPoints" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailCodeForPoints" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" DATETIME,
    "image" TEXT,
    "hideFromRankings" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "isPro", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "zenPoints") SELECT "createdAt", "email", "emailVerified", "id", "image", "isPro", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "zenPoints" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
