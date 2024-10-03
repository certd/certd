import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 */
@Entity('sys_settings')
export class SysSettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ comment: 'key', length: 100 })
  key: string;
  @Column({ comment: '名称', length: 100 })
  title: string;

  @Column({ name: 'setting', comment: '设置', length: 1024, nullable: true })
  setting: string;

  // public 公开读，私有写， private 私有读，私有写
  @Column({ name: 'access', comment: '访问权限' })
  access: string;

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
