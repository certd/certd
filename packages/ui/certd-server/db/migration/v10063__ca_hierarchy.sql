-- 两级 CA：Root -> Intermediate
ALTER TABLE cd_local_ca ADD COLUMN ca_type varchar(20) NOT NULL DEFAULT 'root';
ALTER TABLE cd_local_ca ADD COLUMN parent_id integer;
CREATE INDEX "index_local_ca_parent_id" ON "cd_local_ca" ("parent_id");

-- 历史 CA 均为 root；其证书内实际 pathlen 为 0，标记为 legacy 后不可签发中间CA
UPDATE cd_local_ca SET ca_type = 'root' WHERE ca_type IS NULL OR ca_type = '';
