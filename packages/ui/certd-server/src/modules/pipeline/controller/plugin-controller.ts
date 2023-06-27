import {
  ALL,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { PluginService } from '../service/plugin-service';
import { Constants } from '../../../basic/constants';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/plugin')
export class PluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query) {
    query.userId = this.ctx.user.id;
    const list = this.service.getList();
    return this.ok(list);
  }
}
