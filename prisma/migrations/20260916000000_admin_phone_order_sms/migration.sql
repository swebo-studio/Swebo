-- Lets the admin pick, from the admin center, which numbers get new-order texts.
-- Defaults off so nothing changes until someone opts in; until then ADMIN_PHONE still gets them.
ALTER TABLE "AdminPhone" ADD COLUMN IF NOT EXISTS "orderSms" BOOLEAN NOT NULL DEFAULT false;
