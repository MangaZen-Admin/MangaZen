-- CreateTable
CREATE TABLE "ChapterUnlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChapterUnlock_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" REAL NOT NULL,
    "title" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ES',
    "locale" TEXT NOT NULL DEFAULT 'es-AR',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isEarlyAccess" BOOLEAN NOT NULL DEFAULT false,
    "earlyAccessUntil" DATETIME,
    "earlyAccessPrice" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mangaId" TEXT NOT NULL,
    CONSTRAINT "Chapter_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("createdAt", "id", "language", "locale", "mangaId", "number", "status", "title", "updatedAt") SELECT "createdAt", "id", "language", "locale", "mangaId", "number", "status", "title", "updatedAt" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "zenPoints") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "zenPoints" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ChapterUnlock_chapterId_idx" ON "ChapterUnlock"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterUnlock_userId_chapterId_key" ON "ChapterUnlock"("userId", "chapterId");
