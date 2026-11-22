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
