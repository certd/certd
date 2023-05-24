import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pi_storage')
export class StorageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'scope', comment: '范围' })
  scope: string;

  @Column({ name: 'namespace', comment: '命名空间' })
  namespace: string;

  @Column({ comment: 'version', length: 100, nullable: true })
  version: string;

  @Column({ comment: 'key', length: 100, nullable: true })
  key: string;

  @Column({ comment: 'value', length: 40960, nullable: true })
  value: string;

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
