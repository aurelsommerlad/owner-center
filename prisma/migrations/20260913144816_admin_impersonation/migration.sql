-- CreateTable
CREATE TABLE "AdminImpersonation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AdminImpersonation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminImpersonation_sessionId_endedAt_idx" ON "AdminImpersonation"("sessionId", "endedAt");

-- AddForeignKey
ALTER TABLE "AdminImpersonation" ADD CONSTRAINT "AdminImpersonation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminImpersonation" ADD CONSTRAINT "AdminImpersonation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
