import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 */
@Entity("cd_audit_log")
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", comment: "UserId" })
  userId: number;

  @Column({ name: "user_name", comment: "用户名" })
  userName: string;

  @Column({ name: "project_id", comment: "ProjectId" })
  projectId: number;

  @Column({ name: "project_name", comment: "项目名称" })
  projectName: string;

  @Column({ name: "type", comment: "类型" })
  type: string;

  @Column({ name: "action", comment: "操作" })
  action: string;

  @Column({ name: "content", comment: "内容" })
  content: string;

  @Column({ name: "ip_address", comment: "IP地址" })
  ipAddress: string;

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
