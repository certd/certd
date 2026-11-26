-- 本地CA EAB强制前旧账户清理逻辑（数据安全回归 fixture）
-- 说明：该清理在PR阶段全新安装下为空操作，作者已于250a3897a将其移出flyway迁移序列以减少版本变动；
-- 此处保留原始SQL作为安全回归fixture，验证“仅清理本地CA下EAB强制前旧账户及其订单/授权/挑战，不误伤其他CA/已绑定EAB账户/证书与吊销记录”。
DELETE FROM cd_acme_challenge
WHERE account_id IN (
  SELECT a.id FROM cd_acme_account a
  JOIN cd_local_ca c ON c.id = a.ca_id
  WHERE a.eab_id IS NULL
);

DELETE FROM cd_acme_authz
WHERE account_id IN (
  SELECT a.id FROM cd_acme_account a
  JOIN cd_local_ca c ON c.id = a.ca_id
  WHERE a.eab_id IS NULL
);

DELETE FROM cd_acme_order
WHERE account_id IN (
  SELECT a.id FROM cd_acme_account a
  JOIN cd_local_ca c ON c.id = a.ca_id
  WHERE a.eab_id IS NULL
);

DELETE FROM cd_acme_account
WHERE eab_id IS NULL
  AND ca_id IN (SELECT id FROM cd_local_ca);