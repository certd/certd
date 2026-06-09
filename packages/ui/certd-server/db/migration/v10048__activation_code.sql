-- 激活码表
CREATE TABLE "cd_product_activation_code"
(
    "id"            integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "code"          varchar(50)  NOT NULL,
    "product_id"    integer      NOT NULL,
    "duration"      integer      NOT NULL,
    "batch_no"      varchar(50)  NOT NULL DEFAULT '',
    "status"        varchar(20)  NOT NULL DEFAULT 'unused',
    "used_user_id"  integer,
    "used_time"     integer,
    "expire_time"   integer,
    "disabled_time" integer,
    "exported"      integer      NOT NULL DEFAULT 0,
    "export_time"   integer,
    "remark"        varchar(500) NOT NULL DEFAULT '',
    "create_time"   datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    "update_time"   datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX "index_activation_code_code" ON "cd_product_activation_code" ("code");
CREATE INDEX "index_activation_code_batch_no" ON "cd_product_activation_code" ("batch_no");
CREATE INDEX "index_activation_code_status" ON "cd_product_activation_code" ("status");
CREATE INDEX "index_activation_code_expire_time" ON "cd_product_activation_code" ("expire_time");
CREATE INDEX "index_activation_code_exported" ON "cd_product_activation_code" ("exported");

-- cd_user_suite 增加激活码来源追溯
ALTER TABLE "cd_user_suite"
    ADD COLUMN "activation_code_id" integer;
