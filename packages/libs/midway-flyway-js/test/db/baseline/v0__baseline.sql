-- no sql

CREATE TABLE "sys_permission" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar(100) NOT NULL, "permission" varchar(100), "parent_id" integer NOT NULL DEFAULT (-1), "sort" integer NOT NULL, "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
