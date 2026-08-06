/*
  Warnings:

  - Added the required column `quantity` to the `RentalBooking` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RentalBooking_equipmentId_key";

-- DropIndex
DROP INDEX "RentalBooking_userId_key";

-- AlterTable
ALTER TABLE "RentalBooking" ADD COLUMN     "quantity" INTEGER NOT NULL;
