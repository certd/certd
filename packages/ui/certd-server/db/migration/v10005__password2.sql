INSERT INTO sys_settings ("key", title, setting,access) VALUES ('sys.install','安装信息','{"installTime":'|| (select timestamp from 'flyway_history' where id = 1 )||'}','private');

ALTER TABLE sys_user ADD COLUMN password_version integer DEFAULT 1;
ALTER TABLE sys_user ADD COLUMN password_salt varchar(36);
