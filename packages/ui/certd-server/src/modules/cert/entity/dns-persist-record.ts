import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("cd_dns_persist_record")
export class DnsPersistRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "project_id", nullable: true })
  projectId: number;

  @Column({ length: 255 })
  domain: string;

  @Column({ name: "main_domain", length: 255 })
  mainDomain: string;

  @Column({ name: "ca_type", length: 50 })
  caType: string;

  @Column({ name: "acme_account_access_id" })
  acmeAccountAccessId: number;

  @Column({ name: "account_uri", length: 512 })
  accountUri: string;

  @Column({ name: "host_record", length: 255 })
  hostRecord: string;

  @Column({ name: "record_value", type: "text" })
  recordValue: string;

  @Column({ length: 50, nullable: true })
  policy: string;

  @Column({ name: "persist_until", nullable: true })
  persistUntil: number;

  @Column({ length: 50 })
  status: string;

  @Column({ name: "dns_provider_type", length: 50, nullable: true })
  dnsProviderType: string;

  @Column({ name: "dns_provider_access", nullable: true })
  dnsProviderAccess: number;

  @Column({ name: "record_res", type: "text", nullable: true })
  recordRes: string;

  @Column()
  disabled: boolean;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
