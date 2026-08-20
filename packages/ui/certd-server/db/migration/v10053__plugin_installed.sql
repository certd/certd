ALTER TABLE "pi_plugin" ADD COLUMN "installed" boolean NOT NULL DEFAULT true;

UPDATE "pi_plugin" SET "installed" = true;

ALTER TABLE "pi_plugin" ADD COLUMN "ai_check_status" varchar(32) NOT NULL DEFAULT '';

ALTER TABLE "pi_plugin" ADD COLUMN "vip" varchar(50);

-- 旧版插件没有 full_name，以作者和插件名回填，后续统一以 full_name 识别插件。
UPDATE "pi_plugin"
SET "full_name" = CASE
  WHEN "author" IS NOT NULL AND TRIM("author") <> '' THEN TRIM("author") || '/' || "name"
  ELSE "name"
END
WHERE "full_name" IS NULL OR TRIM("full_name") = '';

ALTER TABLE "cd_domain" ADD COLUMN "remark" varchar(500) NOT NULL DEFAULT '';
