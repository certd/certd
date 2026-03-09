import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pi_history')
export class HistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'pipeline_id', comment: '流水线' })
  pipelineId: number;
  @Column({ comment: '运行状态', length: 40960, nullable: true })
  pipeline: string;

  @Column({ comment: '结果状态', length: 20, nullable: true })
  status: string;

  @Column({ name: 'trigger_type',comment: '触发类型', length: 20, nullable: true })
  triggerType: string;

  @Column({
    name: 'end_time',
    comment: '结束时间',
    nullable: true,
  })
  endTime: Date;

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
  

  pipelineTitle: string;

  fillPipelineTitle() {
    if (this.pipeline) {
      const pipeline = JSON.parse(this.pipeline);
      this.pipelineTitle = pipeline.title;
    }
  }
}
