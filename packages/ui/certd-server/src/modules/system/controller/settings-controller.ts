import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/decorator';
import { CrudController } from '../../../basic/crud-controller';
import { SettingsService } from '../service/settings-service';
import { SettingsEntity } from '../entity/settings';
import { Constants } from '../../../basic/constants';

/**
 */
@Provide()
@Controller('/api/sys/settings')
export class SettingsController extends CrudController<SettingsService> {
  @Inject()
  service: SettingsService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.ctx.user.id;
    return super.page(body);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    body.userId = this.ctx.user.id;
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.ctx.user.id);
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.delete(id);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: SettingsEntity) {
    bean.userId = this.ctx.user.id;
    await this.service.save(bean);
    return this.ok({});
  }

  @Post('/get', { summary: Constants.per.authOnly })
  async get(@Query('key') key: string) {
    const entity = await this.service.getByKey(key, this.ctx.user.id);
    return this.ok(entity);
  }
}
