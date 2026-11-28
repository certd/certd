import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("cd_local_ca_admin")
export class LocalCaAdminEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "ca_id" })
  caId: number;

  @Column({ name: "admin_user_id" })
  adminUserId: number;

  @Column({ length: 20, default: "owner" })
  role: string;

  @Column({ name: "create_time", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
