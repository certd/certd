-- 表：sys_permission
CREATE TABLE "sys_permission" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar(100) NOT NULL, "permission" varchar(100), "parent_id" integer NOT NULL DEFAULT (-1), "sort" integer NOT NULL, "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time)
 VALUES (1, '系统管理;', 'sys', -1, 1, 1, 1624085863636);

