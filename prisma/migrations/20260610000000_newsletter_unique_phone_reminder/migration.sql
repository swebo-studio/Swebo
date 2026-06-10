-- Add reminder tracking column
ALTER TABLE "Newsletter" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Enforce one coupon signup per phone number
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_phone_key" UNIQUE ("phone");
