import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * 本地CA：root 或 intermediate
 * 私钥只保存 EncryptService 密文，接口层不得返回 privateKeyEncrypted / privateKeyHash。
 */
@Entity("cd_local_ca")
export class LocalCaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "名称", length: 100 })
  name: string;

  @Column({ comment: "来源:generated/imported", length: 20, default: "generated" })
  source: string;

  @Column({ name: "ca_type", comment: "CA类型:root/intermediate", length: 20, default: "root" })
  caType: string;

  @Column({ name: "parent_id", comment: "上级CA id", nullable: true })
  parentId: number;

  @Column({ name: "rotated_to_id", nullable: true })
  rotatedToId: number;

  @Column({ name: "dns_server", nullable: true })
  dnsServer: string;

  @Column({ name: "key_type", comment: "密钥类型:rsa2048/rsa4096", length: 20, default: "rsa2048" })
  keyType: string;

  @Column({ name: "key_size", comment: "RSA位数", default: 2048 })
  keySize: number;

  @Column({ comment: "EC曲线(预留)", length: 50, nullable: true })
  curve: string;

  @Column({ name: "hash_algorithm", comment: "签名摘要", length: 20, default: "SHA256" })
  hashAlgorithm: string;

  @Column({ comment: "CA主题JSON", type: "text" })
  subject: string;

  @Column({ name: "subject_cn", comment: "CA CommonName", length: 100 })
  subjectCn: string;

  @Column({ name: "cert_pem", comment: "CA证书PEM", type: "text" })
  certPem: string;

  @Column({ name: "private_key_encrypted", comment: "CA私钥密文", type: "text" })
  privateKeyEncrypted: string;

  @Column({ name: "key_encrypt_version", comment: "私钥加密版本", length: 20, default: "1" })
  keyEncryptVersion: string;

  @Column({ name: "private_key_hash", comment: "私钥明文SHA256", length: 64 })
  privateKeyHash: string;

  @Column({ name: "fingerprint_sha256", comment: "CA证书SHA256指纹", length: 64 })
  fingerprintSha256: string;

  @Column({ name: "not_before", comment: "生效时间(ms)", type: "bigint" })
  notBefore: number;

  @Column({ name: "not_after", comment: "过期时间(ms)", type: "bigint" })
  notAfter: number;

  @Column({ comment: "用途:server/client/both", length: 20, default: "server" })
  usage: string;

  @Column({ name: "allowed_domains", comment: "允许签发的域名后缀JSON", type: "text", nullable: true })
  allowedDomains: string;

  @Column({ name: "max_validity_days", comment: "叶子证书最大有效天数，0=不限制", default: 0 })
  maxValidityDays: number;

  @Column({ name: "acme_enabled", comment: "未来ACME服务端开关", default: false })
  acmeEnabled: boolean;

  @Column({ name: "acme_direct_issue", comment: "EAB直签：跳过域名校验", default: false })
  acmeDirectIssue: boolean;

  @Column({ name: "crl_number", comment: "CRL单调递增序号", type: "bigint", default: 0 })
  crlNumber: number;

  @Column({ name: "export_disabled", comment: "禁止导出CA（含私钥）", default: false })
  exportDisabled: boolean;

  @Column({ name: "last_crl_pem", comment: "最近一次成功生成的CRL", type: "text", nullable: true })
  lastCrlPem: string;

  @Column({ name: "last_crl_time", comment: "最近一次CRL生成时间(ms)", type: "bigint", nullable: true })
  lastCrlTime: number;

  @Column({ name: "deleted", comment: "软删除/归档", default: false })
  deleted: boolean;

  @Column({ name: "revoked", comment: "证书已被父CA吊销（不可逆）", default: false })
  revoked: boolean;

  @Column({ name: "acme_config", comment: "未来ACME配置JSON", type: "text", nullable: true })
  acmeConfig: string;

  @Column({ name: "base_url", comment: "CA对外访问基址，用于CRL/ACME链接；为空使用站点bindUrl", length: 500, nullable: true })
  baseUrl: string;

  @Column({ name: "base_url_locked", comment: "访问基址已用于签发，禁止变更", default: false })
  baseUrlLocked: boolean;

  @Column({ name: "path_length", comment: "未来中间CA的pathLength", nullable: true })
  pathLength: number;

  @Column({ comment: "是否禁用", default: false })
  disabled: boolean;

  @Column({ comment: "备注", length: 500, default: "" })
  remark: string;

  @Column({ name: "create_time", comment: "创建时间", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", comment: "修改时间", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
