-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
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
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
    "hideZenFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "hideFavoritesFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "hideReadingStatsFromPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "hideFromRankings", "id", "image", "isPro", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "zenPoints") SELECT "createdAt", "email", "emailVerified", "hideFromRankings", "id", "image", "isPro", "name", "passwordHash", "requireEmailCodeForPoints", "requirePasswordForPoints", "role", "updatedAt", "zenPoints" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
