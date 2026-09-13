-- CreateTable
CREATE TABLE "GoogleDriveConnectionCheck" (
    "id" TEXT NOT NULL DEFAULT 'google-drive',
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "rootFolderName" TEXT,
    "itemCount" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "GoogleDriveConnectionCheck_pkey" PRIMARY KEY ("id")
);
