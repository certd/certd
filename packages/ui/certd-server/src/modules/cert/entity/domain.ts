import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
/**
 * 域名管理
 */
@Entity("cd_domain")
export class DomainEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "用户ID", name: "user_id" })
  userId: number;

  @Column({ comment: "主域名", length: 100 })
  domain: string;

  @Column({ comment: "校验类型", name: "challenge_type", length: 50 })
  challengeType: string;

  @Column({ comment: "DNS提供商", name: "dns_provider_type", length: 50 })
  dnsProviderType: string;

  @Column({ comment: "DNS提供商授权", name: "dns_provider_access" })
  dnsProviderAccess: number;

  @Column({ comment: "是否禁用", name: "disabled" })
  disabled: boolean;

  @Column({ comment: "注册时间", name: "registration_date" })
  registrationDate: number;

  @Column({ comment: "过期时间", name: "expiration_date" })
  expirationDate: number;

  @Column({ comment: "来源", name: "from_type", length: 50 })
  fromType: string;

  @Column({ comment: "http上传类型", name: "http_uploader_type", length: 50 })
  httpUploaderType: string;

  @Column({ comment: "http上传授权", name: "http_uploader_access" })
  httpUploaderAccess: number;

  @Column({ comment: "http上传根目录", name: "http_upload_root_dir", length: 512 })
  httpUploadRootDir: string;

  @Column({ name: "project_id", comment: "项目Id" })
  projectId: number;

  @Column({
    comment: "创建时间",
    name: "create_time",
    default: () => "CURRENT_TIMESTAMP",
  })
  createTime: Date;
  @Column({
    comment: "修改时间",
    name: "update_time",
    default: () => "CURRENT_TIMESTAMP",
  })
  updateTime: Date;
}
