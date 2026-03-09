import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';


export type PipelineTemplateType = {
  input: {
    [key: string]: {
        value: string;
    };
  }
}


@Entity('pi_template')
export class TemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'pipeline_id', comment: '流水线id' })
  pipelineId: number;

  @Column({ name: 'title', comment: '标题' })
  title: string;
  @Column({ name: 'desc', comment: '说明' })
  desc: string;

  @Column({ comment: '配置', length: 40960 })
  content: string;

  @Column({ comment: '启用/禁用', nullable: true, default: false })
  disabled: boolean;

  @Column({
    name: 'order',
    comment: '排序',
    nullable: true,
  })
  order: number;

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
