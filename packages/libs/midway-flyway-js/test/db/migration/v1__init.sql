-- 表：sys_permission
CREATE TABLE "sys_permission" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar(100) NOT NULL, "permission" varchar(100), "parent_id" integer NOT NULL DEFAULT (-1), "sort" integer NOT NULL, "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (1, '系统管理', 'sys', -1, 1, 1, 1624085863636);



-- 表：sys_role
CREATE TABLE "sys_role" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(100) NOT NULL, "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
INSERT INTO sys_role (id, name, create_time, update_time) VALUES (1, '管理员', 1, 1623749138537);
INSERT INTO sys_role (id, name, create_time, update_time) VALUES (2, '只读角色', 1, 1623749138537);

-- 表：sys_role_permission
CREATE TABLE "sys_role_permission" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, PRIMARY KEY ("role_id", "permission_id"));
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 1);

-- 表：sys_user
CREATE TABLE "sys_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar(100) NOT NULL, "password" varchar(50) NOT NULL, "nick_name" varchar(50), "avatar" varchar(255), "phone_code" varchar(20), "mobile" varchar(20), "email" varchar(100),"remark" varchar(100), "status" integer NOT NULL DEFAULT (1), "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
INSERT INTO sys_user (id, username, password, nick_name, avatar, phone_code, mobile, email, status, create_time, update_time,remark) VALUES (1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', 'admin', NULL, NULL, NULL, NULL, 1, 2011123132, 123132,NULL);
INSERT INTO sys_user (id, username, password, nick_name, avatar, phone_code, mobile, email, status, create_time, update_time,remark) VALUES (2, 'readonly', 'e10adc3949ba59abbe56e057f20f883e', '只读用户', NULL, NULL, NULL, NULL, 1, 2011123132, 123132,'密码：123456');

-- 表：sys_user_role
CREATE TABLE "sys_user_role" ("role_id" integer NOT NULL, "user_id" integer NOT NULL, PRIMARY KEY ("role_id", "user_id"));
INSERT INTO sys_user_role (role_id, user_id) VALUES (1, 1);
INSERT INTO sys_user_role (role_id, user_id) VALUES (2, 2);

-- 索引：IDX_223de54d6badbe43a5490450c3
CREATE UNIQUE INDEX "IDX_223de54d6badbe43a5490450c3" ON "sys_role" ("name");

-- 索引：IDX_9e7164b2f1ea1348bc0eb0a7da
CREATE UNIQUE INDEX "IDX_9e7164b2f1ea1348bc0eb0a7da" ON "sys_user" ("username");


