ALTER TABLE cd_domain ADD COLUMN from_type varchar(20);
ALTER TABLE cd_domain ADD COLUMN registration_date bigint;
ALTER TABLE cd_domain ADD COLUMN expiration_date bigint;
