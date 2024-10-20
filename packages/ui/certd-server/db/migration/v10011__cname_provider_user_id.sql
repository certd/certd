ALTER TABLE cd_cname_provider ADD COLUMN user_id integer;

update cd_cname_provider set user_id = 1;

