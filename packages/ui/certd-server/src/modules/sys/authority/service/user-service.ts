import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import {In, MoreThan, Not, Repository} from 'typeorm';
import { UserEntity } from '../entity/user.js';
import * as _ from 'lodash-es';
import { BaseService, CommonException, Constants, FileService, SysInstallInfo, SysSettingsService } from '@certd/lib-server';
import { RoleService } from './role-service.js';
import { PermissionService } from './permission-service.js';
import { UserRoleService } from './user-role-service.js';
import { UserRoleEntity } from '../entity/user-role.js';
import bcrypt from 'bcryptjs';
import { RandomUtil } from '../../../../utils/random.js';
import dayjs from 'dayjs';
import { DbAdapter } from '../../../db/index.js';
import { simpleNanoId, utils } from '@certd/basic';

export type RegisterType = 'username' | 'mobile' | 'email';
export type ForgotPasswordType = 'mobile' | 'email';

export const AdminRoleId = 1
/**
 * 系统用户
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class UserService extends BaseService<UserEntity> {

  @InjectEntityModel(UserEntity)
  repository: Repository<UserEntity>;
  @Inject()
  roleService: RoleService;
  @Inject()
  permissionService: PermissionService;
  @Inject()
  userRoleService: UserRoleService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  fileService: FileService;
  @Inject()
  dbAdapter: DbAdapter;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  /**
   * 获得个人信息
   */
  async mine(userId: number) {
    const info = await this.repository.findOne({
      where: {
        id: userId,
      },
    });
    delete info.password;
    return info;
  }

  /**
   * 新增
   * @param param
   */
  async add(param) {
    const exists = await this.repository.findOne({
      where: {
        username: param.username,
      },
    });
    if (!_.isEmpty(exists)) {
      throw new CommonException('用户名已经存在');
    }
    const plainPassword = param.password ?? RandomUtil.randomStr(6);
    param.passwordVersion = 2;
    param.password = await this.genPassword(plainPassword, param.passwordVersion); // 默认密码  建议未改密码不能登陆

    if (param.avatar) {
      param.avatar = await this.fileService.saveFile(0, param.avatar, 'public');
    }

    await super.add(param);
    //添加角色
    if (param.roles && param.roles.length > 0) {
      await this.roleService.addRoles(param.id, param.roles);
    }
    return param.id;
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    if (param.id == null) {
      throw new CommonException('id不能为空');
    }
    const userInfo = await this.repository.findOne({
      where: { id: param.id },
    });
    if (!userInfo) {
      throw new CommonException('用户不存在');
    }

    if (param.username) {
      const username = param.username;
      const id = param.id;
      const old = await this.findOne([
        { username: username, id: Not(id) },
        { mobile: username, id: Not(id) },
        { email: username, id: Not(id) },
      ]);
      if (old != null) {
        throw new CommonException('用户名已被占用');
      }
    }
    if (!_.isEmpty(param.password)) {
      param.passwordVersion = 2;
      param.password = await this.genPassword(param.password, param.passwordVersion);
    } else {
      delete param.password;
    }

    if (param.avatar) {
      param.avatar = await this.fileService.saveFile(userInfo.id, param.avatar, 'public');
    }
    await super.update(param);
    await this.roleService.updateRoles(param.id, param.roles);
  }

  private async genPassword(rawPassword: any, passwordVersion: number) {
    if (passwordVersion == null || passwordVersion <= 1) {
      return utils.hash.md5(rawPassword);
    }
    const salt = bcrypt.genSaltSync(10);
    const plainPassword = await this.buildPlainPassword(rawPassword);
    return bcrypt.hashSync(plainPassword, salt);
  }

  async findOne(param: Record<string,any>) {
    return this.repository.findOne({
      where: param,
    });
  }

  async checkPassword(rawPassword: any, hashPassword: any, passwordVersion: number) {
    if (passwordVersion == null || passwordVersion <= 1) {
      return (await this.genPassword(rawPassword, passwordVersion)) === hashPassword;
    }
    const plainPassword = await this.buildPlainPassword(rawPassword);
    return bcrypt.compareSync(plainPassword, hashPassword);
  }

  async buildPlainPassword(rawPassword: string) {
    const setting: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    if (!setting.siteId) {
      throw new CommonException('站点ID还未初始化');
    }
    const prefixSiteId = setting.siteId.substring(1, 5);
    return rawPassword + prefixSiteId;
  }

  /**
   * 获取用户的菜单资源列表
   * @param id
   */
  async getUserPermissions(id: any) {
    const roleIds = await this.roleService.getRoleIdsByUserId(id);
    return await this.roleService.getPermissionByRoleIds(roleIds);
  }

  async register(type: string, user: UserEntity) {
    if (!user.password) {
      user.password = simpleNanoId();
    }
    if (!user.username) {
      user.username = 'user_' + simpleNanoId();
    }

    if (type === 'username') {
      const username = user.username;
      const old = await this.findOne([{ username: username }, { mobile: username }, { email: username }]);
      if (old != null) {
        throw new CommonException('用户名已被注册');
      }
    } else if (type === 'mobile') {
      const mobile = user.mobile;

      user.nickName = mobile.substring(0, 3) + '****' + mobile.substring(7);
      const old = await this.findOne([{ username: mobile }, { mobile: mobile }, { email: mobile }]);
      if (old != null) {
        throw new CommonException('手机号已被注册');
      }
    } else if (type === 'email') {
      const email = user.email;
      const old = await this.findOne([{ username: email }, { mobile: email }, { email: email }]);
      if (old != null) {
        throw new CommonException('邮箱已被注册');
      }
    }

    let newUser: UserEntity = UserEntity.of({
      username: user.username,
      password: user.password,
      email: user.email || '',
      mobile: user.mobile || '',
      nickName: user.nickName || user.username,
      avatar: user.avatar || '',
      phoneCode: user.phoneCode || '86',
      status: 1,
      passwordVersion: 2,
    });
    if (!newUser.password) {
      newUser.password = RandomUtil.randomStr(6);
    }
    newUser.password = await this.genPassword(newUser.password, newUser.passwordVersion);

    await this.transaction(async txManager => {
      newUser = await txManager.save(newUser);
      const userRole: UserRoleEntity = UserRoleEntity.of(newUser.id, Constants.role.defaultUser);
      await txManager.save(userRole);
    });

    delete newUser.password;

    utils.mitter.emit('register', { userId: newUser.id });

    return newUser;
  }

  async forgotPassword(
    data: {
      type: ForgotPasswordType; input?: string, phoneCode?: string,
      randomStr: string, imgCode:string, validateCode: string,
      password: string, confirmPassword: string,
    }
  ) {
    if(!data.type) {
      throw new CommonException('找回类型不能为空');
    }
    if(data.password !== data.confirmPassword) {
      throw new CommonException('两次输入的密码不一致');
    }
    const user = await this.findOne([{ [data.type]: data.input }]);
    console.log('user', user)
    if(!user) {
      throw new CommonException('用户不存在');
      // return;
    }
    await this.resetPassword(user.id, data.password)
    return user.username;
  }

  async changePassword(userId: any, form: any) {
    const user = await this.info(userId);
    const passwordChecked = await this.checkPassword(form.password, user.password, user.passwordVersion);
    if (!passwordChecked) {
      throw new CommonException('原密码错误');
    }
    const param = {
      id: userId,
      password: form.newPassword,
    };

    await this.update(param);
  }

  async resetPassword(userId: any, newPasswd: string) {
    if (!userId) {
      throw new CommonException('userId不能为空');
    }
    const param = {
      id: userId,
      password: newPasswd,
    };
    await this.update(param);
  }

  //@ts-ignore
  async delete(ids: any) {
    if (typeof ids === 'string') {
      ids = ids.split(',');
      ids = ids.map(id => parseInt(id));
    }
    if (ids.length === 0) {
      return;
    }
    if (ids.includes(1)) {
      throw new CommonException('不能删除管理员');
    }
    await super.delete(ids);
  }

  async isAdmin(userId: any) {
    if (!userId) {
      throw new CommonException('userId不能为空');
    }
    const userRoles = await this.userRoleService.find({
      where: {
        userId,
      },
    });
    const roleIds = userRoles.map(item => item.roleId);
    if (roleIds.includes(AdminRoleId)) {
      return true;
    }
  }

  async updateStatus(id: number, status: number) {
    if (!id) {
      throw new CommonException('userId不能为空');
    }
    await this.repository.update(id, {
      status,
    });
  }

  async count(param: { userId?: any } = {}) {
    const count = await this.repository.count({
      where: {
        id: param.userId,
      },
    });
    return count;
  }

  async registerCountPerDay(param: { days: number } = { days: 7 }) {
    const todayEnd = dayjs().endOf('day');
    const result = await this.getRepository()
      .createQueryBuilder('main')
      .select(`${this.dbAdapter.date('main.createTime')}  AS date`) // 将UNIX时间戳转换为日期
      .addSelect('COUNT(1) AS count')
      .where({
        // 0点
        createTime: MoreThan(todayEnd.add(-param.days, 'day').toDate()),
      })
      .groupBy('date')
      .getRawMany();

    return result;
  }

  async getAdmins() {
      const admins = await this.userRoleService.find({
        where: {
          roleId: AdminRoleId,
        },
      });

      const userIds = admins.map(item => item.userId);
      return await this.repository.find({
        where: {
          id: In(userIds),
          status: 1,
        },
        order: {
          updateTime: 'DESC',
        },
      })
  }

  async updateProfile(userId: any, body: any) {

    await this.update({
      id: userId,
      ...body,
    })


  }
}
