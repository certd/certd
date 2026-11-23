-- 仅清理本地CA（本 PR 新增）下、EAB 强制前注册的旧 ACME 账户
-- 安全边界：必须能 JOIN 到 cd_local_ca；不删除其他 CA、证书、吊销记录或 EAB 凭证
DELETE FROM cd_acme_challenge
WHERE account_id IN (
  SELECT a.id
  FROM cd_acme_account a
  JOIN cd_local_ca c ON c.id = a.ca_id
  WHERE a.eab_id IS NULL
);

DELETE FROM cd_acme_authz
WHERE account_id IN (
  SELECT a.id
  FROM cd_acme_account a
  JOIN cd_local_ca c ON c.id = a.ca_id
  WHERE a.eab_id IS NULL
);

DELETE FROM cd_acme_order
WHERE account_id IN (
  SELECT a.id
  FROM cd_acme_account a
  JOIN cd_local_ca c ON c.id = a.ca_id
  WHERE a.eab_id IS NULL
);

DELETE FROM cd_acme_account
WHERE eab_id IS NULL
  AND ca_id IN (SELECT id FROM cd_local_ca);
