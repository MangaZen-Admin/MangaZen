-- CreateTable
CREATE TABLE "ZenTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "paymentProvider" TEXT,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es-mx',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "mangaId" TEXT,
    "chapterId" TEXT,
    "parentId" TEXT,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Comment" ("body", "chapterId", "createdAt", "id", "locale", "mangaId", "parentId", "targetType", "updatedAt", "userId") SELECT "body", "chapterId", "createdAt", "id", "locale", "mangaId", "parentId", "targetType", "updatedAt", "userId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "zenPoints" INTEGER NOT NULL DEFAULT 0,
    "zenCoins" INTEGER NOT NULL DEFAULT 0,
    "zenShards" INTEGER NOT NULL DEFAULT 0,
    "lastDailyLoginAt" DATETIME,
    "proExpiresAt" DATETIME,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "requirePasswordForPoints" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailCodeForPoints" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" DATETIME,
    "image" TEXT,
    "hideFromRankings" BOOLEAN NOT NULL DEFAULT false,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
    "hideZenFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "hideFavoritesFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "hideReadingStatsFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "hideFavoritesFromPublic", "hideFromRankings", "hideReadingStatsFromPublic", "hideZenFromPublic", "id", "image", "isPro", "isProfilePublic", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "username", "zenPoints", "zenCoins") SELECT "createdAt", "email", "emailVerified", "hideFavoritesFromPublic", "hideFromRankings", "hideReadingStatsFromPublic", "hideZenFromPublic", "id", "image", "isPro", "isProfilePublic", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "username", "zenPoints", "zenPoints" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ZenTransaction_paymentId_key" ON "ZenTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "ZenTransaction_userId_createdAt_idx" ON "ZenTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ZenTransaction_userId_currency_createdAt_idx" ON "ZenTransaction"("userId", "currency", "createdAt");

-- CreateIndex
CREATE INDEX "ZenTransaction_userId_type_createdAt_idx" ON "ZenTransaction"("userId", "type", "createdAt");
