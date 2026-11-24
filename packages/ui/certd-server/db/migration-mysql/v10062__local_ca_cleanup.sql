-- 仅清理本地CA下、EAB强制前注册的旧ACME账户及其订单/授权/挑战
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
