import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * 证书申请参数模版
 */
@Entity("cd_cert_apply_template")
export class CertApplyTemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "用户ID", name: "user_id" })
  userId: number;

  @Column({ name: "project_id", comment: "项目ID" })
  projectId: number;

  @Column({ comment: "模版名称", length: 100 })
  name: string;

  @Column({ comment: "配置", type: "text" })
  content: string;

  @Column({ name: "is_default", comment: "是否默认模版", default: false })
  isDefault: boolean;

  @Column({ comment: "是否禁用", default: false })
  disabled: boolean;

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
