import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_passkey')
export class PasskeyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'device_name', comment: '设备名称' })
  deviceName: string;

  @Column({ name: 'passkey_id', comment: 'passkey_id' })
  passkeyId: string;

  @Column({ name: 'public_key', comment: '公钥', type: 'text' })
  publicKey: string;

  @Column({ name: 'counter', comment: '计数器' })
  counter: number;

  @Column({ name: 'transports', comment: '传输方式', type: 'text', nullable: true })
  transports: string;

  @Column({ name: 'registered_at', comment: '注册时间' })
  registeredAt: number;

  @Column({ name: 'create_time', comment: '创建时间', default: () => 'CURRENT_TIMESTAMP' })
  createTime: Date;

  @Column({ name: 'update_time', comment: '修改时间', default: () => 'CURRENT_TIMESTAMP' })
  updateTime: Date;

}
