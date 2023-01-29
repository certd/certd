import { Config, Inject, Provide } from '@midwayjs/decorator';
import { UserService } from '../../authority/service/user-service';
import * as jwt from 'jsonwebtoken';
import { CommonException } from '../../../basic/exception/common-exception';

/**
 * 系统用户
 */
@Provide()
export class LoginService {
  @Inject()
  userService: UserService;
  @Config('biz.jwt')
  private jwt: any;

  /**
   * login
   */
  async login(user) {
    console.assert(user.username != null, '用户名不能为空');
    const info = await this.userService.findOne({ username: user.username });
    if (info == null) {
      throw new CommonException('用户名或密码错误');
    }
    const right = this.userService.checkPassword(user.password, info.password);
    if (!right) {
      throw new CommonException('用户名或密码错误');
    }

    return this.generateToken(info);
  }

  /**
   * 生成token
   * @param user 用户对象
   */
  async generateToken(user) {
    const tokenInfo = {
      username: user.username,
      id: user.id,
    };
    const expire = this.jwt.expire;
    const token = jwt.sign(tokenInfo, this.jwt.secret, {
      expiresIn: expire,
    });

    return {
      token,
      expire,
    };
  }
}
