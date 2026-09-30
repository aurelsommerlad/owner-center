-- AlterTable
ALTER TABLE "OwnerUser" ADD COLUMN     "allProperties" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OwnerUserPropertyAccess" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerUserPropertyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerUserPropertyAccess_propertyId_idx" ON "OwnerUserPropertyAccess"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerUserPropertyAccess_ownerUserId_propertyId_key" ON "OwnerUserPropertyAccess"("ownerUserId", "propertyId");

-- AddForeignKey
ALTER TABLE "OwnerUserPropertyAccess" ADD CONSTRAINT "OwnerUserPropertyAccess_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerUserPropertyAccess" ADD CONSTRAINT "OwnerUserPropertyAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
