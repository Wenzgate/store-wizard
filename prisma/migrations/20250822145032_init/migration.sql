-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'WON', 'LOST', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."BudgetRange" AS ENUM ('LOW', 'MID', 'HIGH', 'LUX');

-- CreateEnum
CREATE TYPE "public"."Timing" AS ENUM ('ASAP', 'W2_4', 'FLEX', 'JUST_INFO');

-- CreateEnum
CREATE TYPE "public"."StoreType" AS ENUM ('VENETIAN', 'ROMAN', 'ROLLER', 'PLEATED', 'CASSETTE');

-- CreateEnum
CREATE TYPE "public"."MountType" AS ENUM ('INSIDE', 'OUTSIDE', 'CEILING');

-- CreateEnum
CREATE TYPE "public"."WindowType" AS ENUM ('WINDOW_SINGLE', 'WINDOW_DOOR', 'BAY', 'CORNER', 'SKYLIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RoomType" AS ENUM ('LIVING', 'KITCHEN', 'BEDROOM', 'BATHROOM', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."Control" AS ENUM ('CHAIN', 'MOTOR', 'CRANK', 'SPRING');

-- CreateEnum
CREATE TYPE "public"."ControlSide" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "public"."MotorPower" AS ENUM ('WIRED', 'BATTERY', 'SOLAR');

-- CreateEnum
CREATE TYPE "public"."FabricOpacity" AS ENUM ('SHEER', 'TRANSLUCENT', 'DIMOUT', 'BLACKOUT', 'SCREEN');

-- CreateEnum
CREATE TYPE "public"."ContactPreference" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "public"."Source" AS ENUM ('WIDGET', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MimeType" AS ENUM ('image_jpeg', 'image_png', 'image_webp', 'application_pdf');

-- CreateTable
CREATE TABLE "public"."QuoteRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "contactPref" "public"."ContactPreference",
    "budget" "public"."BudgetRange",
    "timing" "public"."Timing",
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "consentRgpd" BOOLEAN NOT NULL,
    "acceptEstimateOnly" BOOLEAN,
    "honeypot" TEXT,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "public"."Source" DEFAULT 'WEBSITE',
    "locale" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoreItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "type" "public"."StoreType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "room" "public"."RoomType",
    "roomLabel" TEXT,
    "windowType" "public"."WindowType",
    "mount" "public"."MountType" NOT NULL,
    "control" "public"."Control" NOT NULL,
    "controlSide" "public"."ControlSide",
    "motorBrand" TEXT,
    "motorPower" "public"."MotorPower",
    "motorNotes" TEXT,
    "fabricBrand" TEXT,
    "fabricCollection" TEXT,
    "fabricColorName" TEXT,
    "fabricColorCode" TEXT,
    "fabricOpennessPct" DOUBLE PRECISION,
    "fabricOpacity" "public"."FabricOpacity",
    "colorTone" TEXT,
    "colorCustom" TEXT,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "toleranceCm" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FileRef" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteRequestId" TEXT,
    "storeItemId" TEXT,
    "name" TEXT NOT NULL,
    "mime" "public"."MimeType" NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT,
    "sha256" TEXT,

    CONSTRAINT "FileRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "public"."QuoteRequest"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_email_idx" ON "public"."QuoteRequest"("email");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_createdAt_idx" ON "public"."QuoteRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_utmSource_utmCampaign_idx" ON "public"."QuoteRequest"("utmSource", "utmCampaign");

-- CreateIndex
CREATE INDEX "StoreItem_quoteRequestId_idx" ON "public"."StoreItem"("quoteRequestId");

-- CreateIndex
CREATE INDEX "StoreItem_type_idx" ON "public"."StoreItem"("type");

-- CreateIndex
CREATE INDEX "StoreItem_control_idx" ON "public"."StoreItem"("control");

-- CreateIndex
CREATE INDEX "FileRef_quoteRequestId_idx" ON "public"."FileRef"("quoteRequestId");

-- CreateIndex
CREATE INDEX "FileRef_storeItemId_idx" ON "public"."FileRef"("storeItemId");

-- CreateIndex
CREATE INDEX "FileRef_mime_idx" ON "public"."FileRef"("mime");

-- AddForeignKey
ALTER TABLE "public"."StoreItem" ADD CONSTRAINT "StoreItem_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "public"."QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileRef" ADD CONSTRAINT "FileRef_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "public"."QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileRef" ADD CONSTRAINT "FileRef_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "public"."StoreItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
