CREATE TABLE "sys_settings" (
                              "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                              "user_id" integer NOT NULL,
                              "key" varchar(100) NOT NULL,
                              "title" varchar(100) NOT NULL,
                              "setting" varchar(1024),
                              "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                              "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
