-- A login code stops working after a few wrong guesses, so it cannot be brute-forced.
ALTER TABLE "AdminOtp" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
