-- Orders still unpaid a while after checkout are texted to the admins once;
-- this records when, so the same order is not reported again.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pendingAlertAt" TIMESTAMP(3);
