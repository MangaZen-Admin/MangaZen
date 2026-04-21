-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "iconKey" TEXT,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Badge" ("description", "iconUrl", "id", "name") SELECT "description", "iconUrl", "id", "name" FROM "Badge";
DROP TABLE "Badge";
ALTER TABLE "new_Badge" RENAME TO "Badge";
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
