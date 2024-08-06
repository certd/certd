INSERT INTO sys_settings (key, title, setting,access) VALUES ('sys.install','安装信息','{"installTime":'|| (select (timestamp) from flyway_history where id = 1 )||'}','private');

ALTER TABLE sys_user ADD COLUMN password_version bigint DEFAULT 1;
ALTER TABLE sys_user ADD COLUMN password_salt varchar(36);
alter table sys_user alter column password type varchar(100) using password::varchar(100);
