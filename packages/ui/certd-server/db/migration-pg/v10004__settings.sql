ALTER TABLE "sys_settings" RENAME TO "user_settings";

CREATE TABLE "sys_settings" (
                              "id" integer NOT NULL PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY ,
                              "key" varchar(100) NOT NULL,
                              "title" varchar(100) NOT NULL,
                              "setting" varchar(1024),
                              "access" varchar(100) NOT NULL,
                              "create_time" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                              "update_time" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);


INSERT INTO sys_permission (title, permission, parent_id, sort ) VALUES ('系统设置', 'sys:settings', (SELECT id FROM sys_permission WHERE permission = 'sys'), 1);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, LASTVAL());
INSERT INTO sys_permission (title, permission, parent_id, sort ) VALUES ('查看', 'sys:settings:view', (SELECT id FROM sys_permission WHERE permission = 'sys:settings'), 1);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, LASTVAL());
INSERT INTO sys_permission (title, permission, parent_id, sort ) VALUES ('编辑', 'sys:settings:edit', (SELECT id FROM sys_permission WHERE permission = 'sys:settings'), 1);
INSERT INTO sys_role_permission (role_id, permission_id) VALUES (1, LASTVAL());
