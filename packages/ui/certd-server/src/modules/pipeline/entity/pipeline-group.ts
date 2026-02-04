import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pi_pipeline_group')
export class PipelineGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'name', comment: '分组名称' })
  name: string;

  @Column({ name: 'icon', comment: '图标' })
  icon: string;

  @Column({ name: 'favorite', comment: '收藏' })
  favorite: boolean;

  @Column({ name: 'project_id', comment: '项目id' })
  projectId: number;

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
