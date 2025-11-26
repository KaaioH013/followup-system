-- AlterTable
ALTER TABLE "FollowUpRequest" ADD COLUMN "pcpEmail" TEXT;
ALTER TABLE "FollowUpRequest" ADD COLUMN "pcpName" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "invoicedDate" DATETIME;
