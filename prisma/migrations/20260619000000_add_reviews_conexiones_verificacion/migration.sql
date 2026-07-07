-- AlterEnum: agregar 'cancelado' a EstadoFavor
ALTER TYPE "EstadoFavor" ADD VALUE 'cancelado';

-- CreateEnum
CREATE TYPE "EstadoConexion" AS ENUM ('pendiente', 'aceptada', 'completada', 'cancelada');

-- AlterTable: nuevos campos en users
ALTER TABLE "users"
  ADD COLUMN "telefonoVerificado"   BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN "telefonoVerificadoEn" TIMESTAMP(3),
  ADD COLUMN "promedioCalificacion" DOUBLE PRECISION,
  ADD COLUMN "totalReviews"         INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "suspendido"           BOOLEAN          NOT NULL DEFAULT false;

-- CreateTable: favor_conexiones
CREATE TABLE "favor_conexiones" (
    "id"            TEXT              NOT NULL,
    "favorId"       TEXT              NOT NULL,
    "solicitanteId" TEXT              NOT NULL,
    "ayudanteId"    TEXT              NOT NULL,
    "estado"        "EstadoConexion"  NOT NULL DEFAULT 'pendiente',
    "creadoEn"      TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favor_conexiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: un ayudante solo puede conectarse una vez por favor
CREATE UNIQUE INDEX "favor_conexiones_favorId_ayudanteId_key"
  ON "favor_conexiones"("favorId", "ayudanteId");

-- AddForeignKey: favor_conexiones
ALTER TABLE "favor_conexiones"
  ADD CONSTRAINT "favor_conexiones_favorId_fkey"
  FOREIGN KEY ("favorId") REFERENCES "favores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "favor_conexiones"
  ADD CONSTRAINT "favor_conexiones_solicitanteId_fkey"
  FOREIGN KEY ("solicitanteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "favor_conexiones"
  ADD CONSTRAINT "favor_conexiones_ayudanteId_fkey"
  FOREIGN KEY ("ayudanteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: reviews
CREATE TABLE "reviews" (
    "id"             TEXT         NOT NULL,
    "favorId"        TEXT         NOT NULL,
    "autorId"        TEXT         NOT NULL,
    "destinatarioId" TEXT         NOT NULL,
    "estrellas"      INTEGER      NOT NULL,
    "comentario"     TEXT,
    "creadoEn"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: una reseña por autor por favor
CREATE UNIQUE INDEX "reviews_favorId_autorId_key"
  ON "reviews"("favorId", "autorId");

-- AddForeignKey: reviews
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_favorId_fkey"
  FOREIGN KEY ("favorId") REFERENCES "favores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_destinatarioId_fkey"
  FOREIGN KEY ("destinatarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: verificaciones_telefono
CREATE TABLE "verificaciones_telefono" (
    "id"       TEXT         NOT NULL,
    "userId"   TEXT         NOT NULL,
    "telefono" TEXT         NOT NULL,
    "codigo"   TEXT         NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificaciones_telefono_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: una verificación por usuario
CREATE UNIQUE INDEX "verificaciones_telefono_userId_key"
  ON "verificaciones_telefono"("userId");

-- AddForeignKey: verificaciones_telefono
ALTER TABLE "verificaciones_telefono"
  ADD CONSTRAINT "verificaciones_telefono_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
