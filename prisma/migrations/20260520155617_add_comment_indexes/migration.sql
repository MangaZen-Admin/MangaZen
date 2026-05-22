-- CreateIndex
CREATE INDEX "Comment_mangaId_idx" ON "Comment"("mangaId");

-- CreateIndex
CREATE INDEX "Comment_chapterId_idx" ON "Comment"("chapterId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_targetType_mangaId_idx" ON "Comment"("targetType", "mangaId");

-- CreateIndex
CREATE INDEX "Comment_targetType_chapterId_idx" ON "Comment"("targetType", "chapterId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");
