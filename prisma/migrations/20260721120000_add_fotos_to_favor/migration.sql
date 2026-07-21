-- AlterTable: add fotos array to favores
ALTER TABLE "favores" ADD COLUMN "fotos" TEXT[] NOT NULL DEFAULT '{}';
