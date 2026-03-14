import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 */
@Entity('cd_addon')
export class AddonEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ name: 'key_id', comment: 'key_id', length: 100 })
  keyId: string;
  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;
  @Column({ comment: '名称', length: 100 })
  name: string;


  @Column({ name: 'addon_type', comment: 'addon类型', length: 100 })
  addonType: string;


  @Column({ comment: '类型', length: 100 })
  type: string;

  @Column({ name: 'setting', comment: '设置', length: 10240, nullable: true })
  setting: string;

  @Column({ name: 'is_system', comment: '是否系统级别',  nullable: false, default: false })
  isSystem: boolean;

  @Column({ name: 'is_default', comment: '是否默认',  nullable: false, default: false })
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
