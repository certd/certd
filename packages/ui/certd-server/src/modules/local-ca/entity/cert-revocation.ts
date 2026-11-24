import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * 不可删除的吊销记录：CRL 只依赖此表，证书记录删除后仍保留吊销状态。
 */
@Entity("cd_cert_revocation")
@Index("index_cert_revocation_ca_serial", ["caId", "serialNumber"], { unique: true })
export class CertRevocationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "ca_id", comment: "本地CA id" })
  caId: number;

  @Column({ name: "user_id", comment: "用户id" })
  userId: number;

  @Column({ name: "project_id", comment: "项目id", nullable: true })
  projectId: number;

  @Column({ name: "cert_info_id", comment: "证书记录id（仅追溯，不建外键）", nullable: true })
  certInfoId: number;

  @Column({ name: "serial_number", comment: "证书序列号", length: 100 })
  serialNumber: string;

  @Column({ name: "revoked_time", comment: "吊销时间(ms)", type: "bigint" })
  revokedTime: number;

  @Column({ name: "reason", comment: "吊销原因", length: 50, default: "unspecified" })
  reason: string;

  @Column({ name: "expires_time", comment: "证书过期时间(ms)", type: "bigint", nullable: true })
  expiresTime: number;

  @Column({
    name: "create_time",
    comment: "创建时间",
    default: () => "CURRENT_TIMESTAMP",
  })
  createTime: Date;
}
