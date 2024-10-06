import { Entity, PrimaryColumn } from 'typeorm';

/**
 * 角色权限多对多
 */
@Entity('sys_role_permission')
export class RolePermissionEntity {
  @PrimaryColumn({ name: 'role_id' })
  roleId: number;
  @PrimaryColumn({ name: 'permission_id' })
  permissionId: number;
}
