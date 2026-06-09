import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * 子域名托管
 */
@Entity("pi_sub_domain")
export class SubDomainEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", comment: "UserId" })
  userId: number;

  @Column({ name: "domain", comment: "子域名" })
  domain: string;

  @Column({ name: "disabled", comment: "禁用" })
  disabled: boolean;

  @Column({ name: "project_id", comment: "项目Id" })
  projectId: number;

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
