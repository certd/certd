-- 独立吊销记录：CRL 不依赖 cd_cert_info，删除证书记录后吊销状态仍保留
CREATE TABLE "cd_cert_revocation"
(
  "id"            integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "ca_id"         integer      NOT NULL,
  "user_id"       integer      NOT NULL,
  "project_id"    integer,
  "cert_info_id"  integer,
  "serial_number" varchar(100) NOT NULL,
  "revoked_time"  integer      NOT NULL,
  "reason"        varchar(50)  NOT NULL DEFAULT 'unspecified',
  "expires_time"  integer,
  "create_time"   datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX "index_cert_revocation_ca_serial" ON "cd_cert_revocation" ("ca_id", "serial_number");
CREATE INDEX "index_cert_revocation_ca_id" ON "cd_cert_revocation" ("ca_id");

-- 回填已有吊销记录，避免升级后 CRL 丢失历史吊销状态
INSERT INTO cd_cert_revocation (ca_id, user_id, project_id, cert_info_id, serial_number, revoked_time, reason, expires_time)
SELECT local_ca_id,
       MIN(user_id),
       MIN(project_id),
       MIN(id),
       UPPER(serial_number),
       MAX(COALESCE(revoke_time, 0)),
       'unspecified',
       MAX(expires_time)
FROM cd_cert_info
WHERE local_ca_id IS NOT NULL
  AND serial_number IS NOT NULL
  AND serial_number <> ''
  AND status = 'revoked'
GROUP BY local_ca_id, UPPER(serial_number);
