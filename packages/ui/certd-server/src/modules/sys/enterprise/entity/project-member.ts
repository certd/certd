import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 */
@Entity('cd_project_member')
export class ProjectMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: 'UserId' })
  userId: number;

  @Column({ name: 'project_id', comment: 'ProjectId' })
  projectId: number;
  
  @Column({ name: 'permission', comment: '权限' })
  permission: string; // read / write / admin

  @Column({ name: 'status', comment: '申请状态' })
  status: string; // pending / approved / rejected

  @Column({
    name: 'create_time',
    comment: '创建时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createTime: Date;
  @Column({
    name: 'update_time',
    comment: '修改时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updateTime: Date;
}
