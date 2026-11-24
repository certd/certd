import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("cd_local_ca_grant")
export class LocalCaGrantEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "project_id", default: 0 })
  projectId: number;

  @Column({ name: "created_by_admin_id" })
  createdByAdminId: number;

  @Column({ default: false })
  disabled: boolean;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
