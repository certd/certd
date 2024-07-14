import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 系统用户
 */
@Entity('sys_user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Index({ unique: true })
  @Column({ comment: '用户名', length: 100 })
  username: string;

  @Column({ comment: '密码', length: 100 })
  password: string;

  @Column({ name: 'password_version', comment: '密码版本' })
  passwordVersion: number;

  @Column({ name: 'nick_name', comment: '昵称', length: 100, nullable: true })
  nickName: string;

  @Column({ comment: '头像', length: 255, nullable: true })
  avatar: string;

  @Column({ name: 'phone_code', comment: '区号', length: 20, nullable: true })
  phoneCode: string;

  @Column({ comment: '手机', length: 20, nullable: true })
  mobile: string;

  @Column({ comment: '邮箱', length: 50, nullable: true })
  email: string;

  @Column({ comment: '备注', length: 100, nullable: true })
  remark: string;

  @Column({ comment: '状态 0:禁用 1：启用', default: 1, type: 'int' })
  status: number;
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

  // @ManyToMany(type => RoleEntity, res => res.users)
  // @JoinTable({
  //   name: 'sys_user_roles',
  //   joinColumn: {
  //     name: 'userId',
  //     referencedColumnName: 'id',
  //   },
  //   inverseJoinColumn: {
  //     name: 'roleId',
  //     referencedColumnName: 'id',
  //   },
  // })
  // roles: RoleEntity[];
  static of(user: Partial<UserEntity>) {
    return Object.assign(new UserEntity(), user);
  }
}
