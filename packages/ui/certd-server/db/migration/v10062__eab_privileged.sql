-- EAB直签控制下沉到EAB级：新增privileged(默认false=普通)，移除CA级acme_direct_issue
ALTER TABLE "cd_acme_eab" ADD COLUMN "privileged" boolean NOT NULL DEFAULT (0);
ALTER TABLE "cd_local_ca" DROP COLUMN "acme_direct_issue";