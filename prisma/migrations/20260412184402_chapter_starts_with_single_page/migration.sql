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
    "startsWithSinglePage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mangaId" TEXT NOT NULL,
    CONSTRAINT "Chapter_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("createdAt", "earlyAccessPrice", "earlyAccessUntil", "id", "isEarlyAccess", "language", "locale", "mangaId", "number", "status", "title", "updatedAt") SELECT "createdAt", "earlyAccessPrice", "earlyAccessUntil", "id", "isEarlyAccess", "language", "locale", "mangaId", "number", "status", "title", "updatedAt" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
