/*
  Warnings:

  - The values [SPEAKER,VIEWER] on the enum `RoomRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `type` on the `Room` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoomRole_new" AS ENUM ('HOST', 'PARTICICPANT');
ALTER TABLE "RoomParticipant" ALTER COLUMN "role" TYPE "RoomRole_new" USING ("role"::text::"RoomRole_new");
ALTER TYPE "RoomRole" RENAME TO "RoomRole_old";
ALTER TYPE "RoomRole_new" RENAME TO "RoomRole";
DROP TYPE "public"."RoomRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "type";

-- DropEnum
DROP TYPE "RoomType";
