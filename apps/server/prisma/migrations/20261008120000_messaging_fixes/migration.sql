-- AlterTable
ALTER TABLE "ChannelMember" ADD COLUMN     "lastReadMessageId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "clientMessageId" TEXT;

-- CreateIndex
CREATE INDEX "ChannelMember_channelId_idx" ON "ChannelMember"("channelId");

-- CreateIndex
CREATE INDEX "DirectMessage_workspaceId_senderId_receiverId_createdAt_idx" ON "DirectMessage"("workspaceId", "senderId", "receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_receiverId_idx" ON "DirectMessage"("receiverId");

-- CreateIndex
CREATE INDEX "Message_channelId_createdAt_id_idx" ON "Message"("channelId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Message_senderId_clientMessageId_key" ON "Message"("senderId", "clientMessageId");

-- CreateIndex
CREATE INDEX "WorkspaceInvites_workspaceId_idx" ON "WorkspaceInvites"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- AddForeignKey
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: unread state did not exist before, so everyone starts caught up instead of
-- seeing every channel they belong to marked unread. Runs after the history index exists.
UPDATE "ChannelMember" AS cm
SET "lastReadMessageId" = (
    SELECT m."id" FROM "Message" AS m
    WHERE m."channelId" = cm."channelId"
    ORDER BY m."createdAt" DESC, m."id" DESC
    LIMIT 1
);
