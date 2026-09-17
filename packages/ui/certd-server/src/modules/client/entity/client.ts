import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * certd-client 客户端登记信息。
 * 客户端自身信息（机器名、版本、系统、关联OpenKey）保留独立列；
 * 站点统计等快照统一存 content JSON，后续扩展直接往 JSON 增加字段，无需变更表结构。
 */
@Entity("cd_client")
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", comment: "用户id" })
  userId: number;

  @Column({ name: "project_id", comment: "项目id", nullable: true })
  projectId: number;

  @Column({ name: "client_id", comment: "客户端唯一标识", length: 64 })
  clientId: string;

  @Column({ name: "key_id", comment: "关联OpenKey", length: 64, nullable: true })
  keyId: string;

  @Column({ name: "machine_name", comment: "本机名称", length: 255, nullable: true })
  machineName: string;

  @Column({ name: "version", comment: "客户端版本", length: 64, nullable: true })
  version: string;

  @Column({ name: "os", comment: "操作系统", length: 64, nullable: true })
  os: string;

  @Column({ name: "content", comment: "站点统计等快照(JSON)", type: "text", nullable: true })
  content: string;

  @Column({ name: "last_heartbeat_at", comment: "上次心跳时间" })
  lastHeartbeatAt: number;

  @Column({
    name: "create_time",
    comment: "创建时间",
    default: () => "CURRENT_TIMESTAMP",
  })
  createTime: Date;

  @Column({
    name: "update_time",
    comment: "修改时间",
    default: () => "CURRENT_TIMESTAMP",
  })
  updateTime: Date;

  // 以下均为非数据库字段：分页查询时从 content 解析展开，便于前端直接展示。
  appCount?: number;
  siteCount?: number;
  httpsSiteCount?: number;
  syncedSiteCount?: number;
  failedSiteCount?: number;
  lastSyncAt?: number;
  lastSyncStatus?: string;
  online?: boolean;
}
