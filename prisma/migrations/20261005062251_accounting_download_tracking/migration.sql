-- CreateTable
CREATE TABLE "StatementDocumentDownload" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementDocumentDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementDocumentDownload_documentId_idx" ON "StatementDocumentDownload"("documentId");

-- CreateIndex
CREATE INDEX "StatementDocumentDownload_ownerUserId_idx" ON "StatementDocumentDownload"("ownerUserId");

-- AddForeignKey
ALTER TABLE "StatementDocumentDownload" ADD CONSTRAINT "StatementDocumentDownload_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StatementDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementDocumentDownload" ADD CONSTRAINT "StatementDocumentDownload_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
