import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("pi_plugin_market_item")
export class PluginMarketItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "app_id", comment: "平台应用ID", nullable: true })
  appId: number;

  @Column({ name: "full_name", comment: "插件完整名称", length: 200 })
  fullName: string;

  @Column({ name: "author", comment: "作者", length: 100, nullable: true })
  author: string;

  @Column({ name: "name", comment: "插件名称", length: 100, nullable: true })
  name: string;

  @Column({ name: "plugin_type", comment: "插件类型", length: 100, nullable: true })
  pluginType: string;

  @Column({ name: "title", comment: "标题", length: 200, nullable: true })
  title: string;

  @Column({ name: "icon", comment: "图标", length: 200, nullable: true })
  icon: string;

  @Column({ name: "group", comment: "分组", length: 100, nullable: true })
  group: string;

  @Column({ name: "desc", comment: "描述", length: 1000, nullable: true })
  desc: string;

  @Column({ name: "latest", comment: "最新版本", length: 100, nullable: true })
  latest: string;

  @Column({ name: "status", comment: "状态", length: 100, nullable: true })
  status: string;

  @Column({ name: "download_count", comment: "下载次数", nullable: true })
  downloadCount: number;

  @Column({ name: "sync_time", comment: "同步时间", nullable: true })
  syncTime: number;

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
}
