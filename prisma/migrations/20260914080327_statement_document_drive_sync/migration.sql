-- DropForeignKey
ALTER TABLE "StatementDocument" DROP CONSTRAINT "StatementDocument_ownerId_fkey";

-- AlterTable
ALTER TABLE "StatementDocument" ADD COLUMN     "driveModifiedAt" TIMESTAMP(3),
ALTER COLUMN "ownerId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StatementDocument_driveFileId_key" ON "StatementDocument"("driveFileId");

-- AddForeignKey
ALTER TABLE "StatementDocument" ADD CONSTRAINT "StatementDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
