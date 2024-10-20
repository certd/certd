ALTER TABLE cd_cname_provider ADD COLUMN user_id bigint;

update cd_cname_provider set user_id = 1;

