
CREATE TABLE "cd_job_history"
(
  "id"          integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"     integer      NOT NULL,
  "project_id"  integer      NOT NULL,
  "type"        varchar(100) NOT NULL,
  "title"       varchar(512) NOT NULL,
  "related_id"  varchar(100),
  "result"      varchar(100) NOT NULL,
  "content"     text         ,
  "start_at"    integer      NOT NULL,
  "end_at"      integer      ,
  "create_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);



CREATE INDEX "index_job_history_user_id" ON "cd_job_history" ("user_id");
CREATE INDEX "index_job_history_project_id" ON "cd_job_history" ("project_id");
CREATE INDEX "index_job_history_type" ON "cd_job_history" ("type");
