-- Allowed admin phone numbers for OTP login
CREATE TABLE "AdminPhone" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPhone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPhone_phone_key" ON "AdminPhone"("phone");

-- One-time login codes
CREATE TABLE "AdminOtp" (
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOtp_pkey" PRIMARY KEY ("phone")
);
