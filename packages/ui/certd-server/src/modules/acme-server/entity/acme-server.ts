import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("cd_acme_account")
export class AcmeAccountEntity {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "project_id", nullable: true })
  projectId: number;

  @Column({ type: "text" })
  jwk: string;

  @Column({ length: 64 })
  thumbprint: string;

  @Column({ name: "eab_id", length: 32, nullable: true })
  eabId: string;

  @Column({ length: 20, default: "valid" })
  status: string;

  @Column({ type: "text", nullable: true })
  contact: string;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}

@Entity("cd_acme_order")
export class AcmeOrderEntity {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "account_id", length: 32 })
  accountId: string;

  @Column({ length: 20, default: "pending" })
  status: string;

  @Column({ type: "text" })
  identifiers: string;

  @Column({ name: "authz_ids", type: "text" })
  authzIds: string;

  @Column({ type: "text", nullable: true })
  csr: string;

  @Column({ name: "cert_pem", type: "text", nullable: true })
  certPem: string;

  @Column({ name: "serial_number", length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: "text", nullable: true })
  error: string;

  @Column({ name: "expires_time", type: "bigint" })
  expiresTime: number;

  @Column({ name: "direct_issue", default: false })
  directIssue: boolean;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}

@Entity("cd_acme_authz")
export class AcmeAuthzEntity {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "order_id", length: 32 })
  orderId: string;

  @Column({ name: "account_id", length: 32 })
  accountId: string;

  @Column({ name: "identifier_type", length: 20, default: "dns" })
  identifierType: string;

  @Column({ name: "identifier_value", length: 255 })
  identifierValue: string;

  @Column({ default: false })
  wildcard: boolean;

  @Column({ length: 20, default: "pending" })
  status: string;

  @Column({ name: "expires_time", type: "bigint" })
  expiresTime: number;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}

@Entity("cd_acme_challenge")
export class AcmeChallengeEntity {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "order_id", length: 32 })
  orderId: string;

  @Column({ name: "authz_id", length: 32 })
  authzId: string;

  @Column({ name: "account_id", length: 32 })
  accountId: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 255 })
  token: string;

  @Column({ name: "key_authorization", length: 255 })
  keyAuthorization: string;

  @Column({ length: 20, default: "pending" })
  status: string;

  @Column({ type: "text", nullable: true })
  error: string;

  @Column({ name: "validated_time", type: "bigint", nullable: true })
  validatedTime: number;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}

@Entity("cd_acme_eab")
export class AcmeEabEntity {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "grant_id", nullable: true })
  grantId: number;

  @Column({ name: "user_id", default: 0 })
  userId: number;

  @Column({ name: "project_id", nullable: true })
  projectId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  kid: string;

  @Column({ name: "hmac_key_encrypted", type: "text" })
  hmacKeyEncrypted: string;

  @Column({ name: "hmac_key_hash", length: 64 })
  hmacKeyHash: string;

  @Column({ name: "allowed_domains", type: "text", nullable: true })
  allowedDomains: string;

  @Column({ name: "max_uses", default: 1 })
  maxUses: number;

  @Column({ name: "used_count", default: 0 })
  usedCount: number;

  @Column({ name: "expires_time", type: "bigint", nullable: true })
  expiresTime: number;

  @Column({ default: false })
  disabled: boolean;

  @Column({ comment: "泄漏不可恢复禁用：禁止重新启用", default: false })
  revoked: boolean;

  @Column({ comment: "特权EAB：跳过域名所有权验证直接签发（CA与EAB域名范围限制仍生效）", default: false })
  privileged: boolean;

  @Column({ length: 255, nullable: true })
  remark: string;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
