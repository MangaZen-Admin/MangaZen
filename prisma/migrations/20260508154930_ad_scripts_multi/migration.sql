/*
  Warnings:

  - You are about to drop the column `script` on the `AdScript` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AdScript" DROP COLUMN "script",
ADD COLUMN     "scripts" JSONB NOT NULL DEFAULT '[]';
