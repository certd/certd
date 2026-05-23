import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 授权配置
 */
@Entity('cd_access')
export class AccessEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ name: 'key_id', comment: 'key_id', length: 100 })
  keyId: string;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number; // 0为系统级别, -1为企业，大于1为用户

  @Column({ comment: '名称', length: 100 })
  name: string;

  @Column({ comment: '类型', length: 100 })
  type: string;

  @Column({ name: 'subtype', comment: '子类型', length: 100, nullable: true })
  subtype: string;

  @Column({ name: 'setting', comment: '设置', length: 10240, nullable: true })
  setting: string;

  @Column({ name: 'encrypt_setting', comment: '已加密设置', length: 10240, nullable: true })
  encryptSetting: string;

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
