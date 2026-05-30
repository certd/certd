import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 */
@Entity("cd_site_ip")
export class SiteIpEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ name: "user_id", comment: "用户id" })
  userId: number;
  @Column({ name: "site_id", comment: "站点id" })
  siteId: number;
  @Column({ name: "ip_address", comment: "IP", length: 100 })
  ipAddress: string;

  @Column({ name: "cert_domains", comment: "证书域名", length: 4096 })
  certDomains: string;
  @Column({ name: "cert_status", comment: "证书状态", length: 100 })
  certStatus: string;
  @Column({ name: "cert_provider", comment: "证书颁发机构", length: 100 })
  certProvider: string;
  @Column({ name: "cert_expires_time", comment: "证书到期时间" })
  certExpiresTime: number;
  @Column({ name: "last_check_time", comment: "上次检查时间" })
  lastCheckTime: number;
  @Column({ name: "check_status", comment: "检查状态" })
  checkStatus: string;
  @Column({ name: "error", comment: "错误信息" })
  error: string;
  @Column({ name: "from", comment: "来源" })
  from: string;
  @Column({ name: "remark", comment: "备注" })
  remark: string;
  @Column({ name: "disabled", comment: "禁用启用" })
  disabled: boolean;
  @Column({ name: "project_id", comment: "项目id" })
  projectId: number;

  @Column({ name: "create_time", comment: "创建时间", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;
  @Column({ name: "update_time", comment: "修改时间", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
