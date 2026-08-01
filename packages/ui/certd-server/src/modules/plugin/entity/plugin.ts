import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("pi_plugin")
export class PluginEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "name", comment: "Key" })
  name: string;

  @Column({ name: "icon", comment: "图标" })
  icon: string;

  @Column({ name: "title", comment: "标题" })
  title: string;

  @Column({ name: "group", comment: "分组" })
  group: string;

  @Column({ name: "desc", comment: "描述" })
  desc: string;

  @Column({ comment: "配置", length: 40960 })
  setting: string;

  @Column({ name: "sys_setting", comment: "系统配置", length: 40960 })
  sysSetting: string;

  @Column({ comment: "脚本", length: 40960 })
  content: string;

  @Column({ comment: "类型", length: 100, nullable: true })
  type: string; // builtIn | store

  @Column({ comment: "启用/禁用", default: false })
  disabled: boolean;

  @Column({ comment: "版本", length: 100, nullable: true })
  version: string;

  @Column({ comment: "插件类型", length: 100, nullable: true })
  pluginType: string;

  @Column({ comment: "是否已安装", default: true })
  installed: boolean;

  @Column({ comment: "元数据", length: 40960, nullable: true })
  metadata: string;

  @Column({ comment: "额外配置", length: 40960, nullable: true })
  extra: string;

  @Column({ comment: "作者", length: 100, nullable: true })
  author: string;

  @Column({ name: "app_id", comment: "平台应用ID", nullable: true })
  appId: number;

  @Column({ name: "developer_id", comment: "平台开发者ID", nullable: true })
  developerId: number;

  @Column({ name: "full_name", comment: "插件完整名称", length: 200, nullable: true })
  fullName: string;

  @Column({ comment: "最新版本", length: 100, nullable: true })
  latest: string;

  @Column({ comment: "市场状态", length: 100, nullable: true })
  status: string;

  @Column({ name: "download_count", comment: "下载次数", nullable: true })
  downloadCount: number;

  @Column({ comment: "评分", nullable: true })
  score: number;

  @Column({ name: "ai_check_status", comment: "最新版本AI审核状态", length: 32, default: "" })
  aiCheckStatus: string;

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
