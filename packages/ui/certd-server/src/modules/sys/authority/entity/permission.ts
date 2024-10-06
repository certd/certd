import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 权限
 */
@Entity('sys_permission')
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ comment: '标题', length: 100 })
  title: string;
  /**
   * 权限代码
   * 示例：sys:user:read
   */
  @Column({ comment: '权限代码', length: 100, nullable: true })
  permission: string;

  @Column({ name: 'parent_id', comment: '父节点ID', default: -1 })
  parentId: number;

  @Column({ comment: '排序号' })
  sort: number;

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

  // @ManyToMany(type => RoleEntity, res => res.permissions)
  // roles: RoleEntity[];
}
