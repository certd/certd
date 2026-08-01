ALTER TABLE "pi_plugin" ADD COLUMN "installed" boolean NOT NULL DEFAULT true;

UPDATE "pi_plugin" SET "installed" = true;

ALTER TABLE "pi_plugin" ADD COLUMN "ai_check_status" varchar(32) NOT NULL DEFAULT '';
