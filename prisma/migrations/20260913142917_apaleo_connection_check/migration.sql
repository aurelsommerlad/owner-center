-- CreateTable
CREATE TABLE "ApaleoConnectionCheck" (
    "id" TEXT NOT NULL DEFAULT 'apaleo',
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "propertyCount" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "ApaleoConnectionCheck_pkey" PRIMARY KEY ("id")
);
