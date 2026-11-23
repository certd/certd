-- EAB强制前注册的旧账户：删除其订单/授权/挑战/账户，禁止继续使用
DELETE FROM cd_acme_challenge WHERE account_id IN (SELECT id FROM cd_acme_account WHERE eab_id IS NULL);
DELETE FROM cd_acme_authz WHERE account_id IN (SELECT id FROM cd_acme_account WHERE eab_id IS NULL);
DELETE FROM cd_acme_order WHERE account_id IN (SELECT id FROM cd_acme_account WHERE eab_id IS NULL);
DELETE FROM cd_acme_account WHERE eab_id IS NULL;
