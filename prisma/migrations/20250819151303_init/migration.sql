-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "contactPref" TEXT,
    "budget" TEXT,
    "timing" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "consentRgpd" BOOLEAN NOT NULL,
    "acceptEstimateOnly" BOOLEAN,
    "honeypot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT DEFAULT 'WEBSITE',
    "locale" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "room" TEXT,
    "roomLabel" TEXT,
    "windowType" TEXT,
    "mount" TEXT NOT NULL,
    "control" TEXT NOT NULL,
    "controlSide" TEXT,
    "motorBrand" TEXT,
    "motorPower" TEXT,
    "motorNotes" TEXT,
    "fabricBrand" TEXT,
    "fabricCollection" TEXT,
    "fabricColorName" TEXT,
    "fabricColorCode" TEXT,
    "fabricOpennessPct" REAL,
    "fabricOpacity" TEXT,
    "colorTone" TEXT,
    "colorCustom" TEXT,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "toleranceCm" REAL,
    "notes" TEXT,
    CONSTRAINT "StoreItem_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileRef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteRequestId" TEXT,
    "storeItemId" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT,
    "sha256" TEXT,
    CONSTRAINT "FileRef_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileRef_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_email_idx" ON "QuoteRequest"("email");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_createdAt_idx" ON "QuoteRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_utmSource_utmCampaign_idx" ON "QuoteRequest"("utmSource", "utmCampaign");

-- CreateIndex
CREATE INDEX "StoreItem_quoteRequestId_idx" ON "StoreItem"("quoteRequestId");

-- CreateIndex
CREATE INDEX "StoreItem_type_idx" ON "StoreItem"("type");

-- CreateIndex
CREATE INDEX "StoreItem_control_idx" ON "StoreItem"("control");

-- CreateIndex
CREATE INDEX "FileRef_quoteRequestId_idx" ON "FileRef"("quoteRequestId");

-- CreateIndex
CREATE INDEX "FileRef_storeItemId_idx" ON "FileRef"("storeItemId");

-- CreateIndex
CREATE INDEX "FileRef_mime_idx" ON "FileRef"("mime");
