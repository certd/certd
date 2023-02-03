-- 表：sys_permission
CREATE TABLE "sys_permission" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar(100) NOT NULL, "permission" varchar(100), "parent_id" integer NOT NULL DEFAULT (-1), "sort" integer NOT NULL, "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (1, '系统管理', 'sys', -1, 1, 1, 1624085863636);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (2, '权限管理', 'sys:auth', 1, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (3, '用户管理', 'sys:auth:user', 2, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (4, '查看', 'sys:auth:user:view', 3, 100, 1, 1624189112333);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (5, '权限管理', 'sys:auth:per', 2, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (6, '查看', 'sys:auth:per:view', 5, 100, 1, 1624189161317);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (7, '角色管理', 'sys:auth:role', 2, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (8, '查看', 'sys:auth:role:view', 7, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (9, '修改', 'sys:auth:user:edit', 3, 300, 1, 1624189127688);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (10, '删除', 'sys:auth:user:remove', 3, 400, 1, 1624189133184);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (11, '添加', 'sys:auth:user:add', 3, 200, 1, 1624189142576);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (12, '修改', 'sys:auth:role:edit', 7, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (13, '删除', 'sys:auth:role:remove', 7, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (14, '添加', 'sys:auth:role:add', 7, 1, 1, 1);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (15, '修改', 'sys:auth:per:edit', 5, 300, 1, 1624189308837);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (16, '删除', 'sys:auth:per:remove', 5, 400, 1, 1624189256926);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (17, '添加', 'sys:auth:per:add', 5, 200, 1, 1624189283766);
INSERT INTO sys_permission (id, title, permission, parent_id, sort, create_time, update_time) VALUES (18,'授权','sys:auth:role:authz',7,100,1,1624335712144);



-- 表：sys_role
CREATE TABLE "sys_role" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(100) NOT NULL, "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP));
INSERT INTO sys_role (id, name, create_time, update_time) VALUES (1, '管理员', 1, 1623749138537);
INSERT INTO sys_role (id, name, create_time, update_time) VALUES (2, '只读角色', 1, 1623749138537);

-- 表：sys_role_permission
CREATE TABLE "sys_role_permission" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, PRIMARY KEY ("role_id", "permission_id"));
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 1);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 2);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 3);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 4);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 5);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 6);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 7);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 8);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 9);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 10);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 11);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 12);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 13);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 14);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 15);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 16);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 17);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, 18);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, -1);

INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 4);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 6);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 8);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 1);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 2);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 3);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 5);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, 7);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (2, -1);

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


