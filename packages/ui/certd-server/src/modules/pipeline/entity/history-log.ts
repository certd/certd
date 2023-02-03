import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pi_history_log')
export class HistoryLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'pipeline_id', comment: '流水线' })
  pipelineId: number;

  @Column({ name: 'history_id', comment: '历史id' })
  historyId: number;

  @Column({
    name: 'node_id',
    comment: '任务节点id',
    length: 100,
    nullable: true,
  })
  nodeId: string;

  @Column({ comment: '日志内容', length: 40960, nullable: true })
  logs: string;

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
