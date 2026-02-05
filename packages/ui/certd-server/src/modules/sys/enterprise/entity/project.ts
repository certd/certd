import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 */
@Entity('cd_project')
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: 'UserId' })
  userId: number;

  @Column({ name: 'name', comment: '项目名称' })
  name: string;

  @Column({ name: 'disabled', comment: '禁用' })
  disabled: boolean;

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

  // user permission read write admin
  permission:string
}
