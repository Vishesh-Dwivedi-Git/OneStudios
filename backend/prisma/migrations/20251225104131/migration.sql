/*
  Warnings:

  - The values [PARTICICPANT] on the enum `RoomRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoomRole_new" AS ENUM ('HOST', 'PARTICIPANT');
ALTER TABLE "RoomParticipant" ALTER COLUMN "role" TYPE "RoomRole_new" USING ("role"::text::"RoomRole_new");
ALTER TYPE "RoomRole" RENAME TO "RoomRole_old";
ALTER TYPE "RoomRole_new" RENAME TO "RoomRole";
DROP TYPE "public"."RoomRole_old";
COMMIT;
