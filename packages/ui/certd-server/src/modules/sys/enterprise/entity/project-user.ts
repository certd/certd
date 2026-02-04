import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 */
@Entity('cd_project_user')
export class ProjectUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: 'UserId' })
  userId: number;

  @Column({ name: 'project_id', comment: 'ProjectId' })
  projectId: number;
  
  @Column({ name: 'permission', comment: '权限' })
  permission: string; // read / write

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
