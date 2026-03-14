import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pi_notification')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'key_id', comment: 'key_id', length: 100 })
  keyId: string;

  @Column({ name: 'user_id', comment: 'UserId' })
  userId: number;

  @Column({ name: 'type', comment: '通知类型' })
  type: string;

  @Column({ name: 'name', comment: '名称' })
  name: string;

  @Column({ name: 'setting', comment: '通知配置', length: 10240 })
  setting: string;

  @Column({ name: 'is_default', comment: '是否默认' })
  isDefault: boolean;

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
