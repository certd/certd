CREATE TABLE "cd_cert_apply_template"
(
  "id"          integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"     integer      NOT NULL,
  "project_id"  integer      NULL,
  "name"        varchar(100) NOT NULL,
  "content"     text         NOT NULL,
  "is_default"  boolean      NOT NULL DEFAULT (false),
  "disabled"    boolean      NOT NULL DEFAULT (false),
  "create_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX "index_cert_apply_template_user_id" ON "cd_cert_apply_template" ("user_id");
CREATE INDEX "index_cert_apply_template_project_id" ON "cd_cert_apply_template" ("project_id");
CREATE INDEX "index_cert_apply_template_default" ON "cd_cert_apply_template" ("user_id", "project_id", "is_default");
