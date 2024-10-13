import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pi_plugin')
export class PluginEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', comment: 'Key' })
  name: string;

  @Column({ name: 'icon', comment: '图标' })
  icon: string;

  @Column({ name: 'title', comment: '标题' })
  title: string;

  @Column({ name: 'group', comment: '分组' })
  group: string;

  @Column({ name: 'desc', comment: '描述' })
  desc: string;

  @Column({ comment: '配置', length: 40960 })
  setting: string;

  @Column({ comment: '系统配置', length: 40960 })
  sysSetting: string;

  @Column({ comment: '脚本', length: 40960 })
  content: string;

  @Column({ comment: '类型', length: 100, nullable: true })
  type: string; // builtIn | custom

  @Column({ comment: '启用/禁用', default: false })
  disabled: boolean;

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
